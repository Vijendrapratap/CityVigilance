# CityVigilance system architecture

For the command centre, the police department, and the build team. Dated 1 November 2026.

This is the document to hand to someone who needs the whole picture. It explains how city cameras become a people count, a weapon check, an accident alert, and a traffic-signal plan, and how that same design is used first as a demo and later as a deployment.

**Assumption, not a decision.** The operating context is still India: emergency number 112, and traffic conditions that include triple-riding, helmets, and non-standard number plates. No city, camera brand, vision-model vendor, signal controller, or hosting site is chosen.

The earlier screen recording was the command-centre desk only. The alerts on that screen were scripted red-light samples so a person could click dismiss, confirm, and escalate. No city camera was connected. This document is the camera architecture that desk sits on.

## The three situations

These are the situations the command centre must handle. Other detections (number plates, helmets, fire, waterlogging) use the same pipes later. They are not required for the first demo.

**A crowd gathers.** At that camera the screen shows how many people are there, and it keeps updating. If the view also shows a shape consistent with a firearm or a blade, the same incident is marked **Possible weapon**. Police are deployed from that incident.

**An accident happens.** The screen opens an accident incident on that camera, with the clip. An ambulance is deployed from that incident.

**Traffic is building.** The screen shows the queue on each arm of the junction and a suggested green time that clears the longest queue. Traffic staff accept the plan. When the city's signal controller is connected, that acceptance changes the lights. Until then the plan is shown and logged, and a person still changes the lights.

The count, the accident clip, and the queue picture appear as soon as the model has a result. Deploy is a button on that incident. In the demo the button records the order in the command centre. When the department connects its dispatch system, the same button sends the order there. A weapon line stays "possible" until an officer has looked at the clip, because a phone, a tool, or an object in a procession can match a weapon shape.

## One path, from camera to action

```mermaid
flowchart LR
  cameras[City cameras]
  gateway[Stream gateway]
  bus[Frame bus]
  crowd[Crowd count]
  weapon[Weapon check]
  crash[Accident]
  traffic[Traffic queues]
  events[Events]
  desk[Command centre]
  police[Deploy police]
  ambulance[Deploy ambulance]
  signals[Signal plan]
  log[Outcome log]

  cameras --> gateway --> bus
  bus --> crowd --> events
  bus --> weapon --> events
  bus --> crash --> events
  bus --> traffic --> events
  events --> desk
  desk --> police --> log
  desk --> ambulance --> log
  desk --> signals --> log
```

Read it left to right.

1. City cameras send live video. For a demo, sample video files stand in for cameras.
2. The stream gateway holds one connection per camera. Models do not log into the camera themselves. One extra login per model would overload the camera.
3. The frame bus keeps the latest pictures and a short clip, about ten seconds, for each camera.
4. Each model reads that bus and answers one question. Crowd count, weapon check, accident, and traffic queues run at the same time on the same pictures.
5. Every model writes an event in the same shape, whether the model runs on the police network or through a vision API.
6. The command centre turns events at the same place and time into one incident.
7. An officer deploys police, deploys an ambulance, or accepts a signal plan.
8. The outcome log stores who acted, on which camera, and what they ordered.

## What each block does

| Block | Job | What can be swapped without rebuilding the desk |
| --- | --- | --- |
| City cameras | Live video from junctions and public places the department already covers | A sample file, a single test camera, or the city's existing camera system |
| Stream gateway | Connect, reconnect, timestamp, and keep the last few seconds | The only block that must know how that camera brand sends video |
| Frame bus | Give every model the same frames and clips | Nothing. New models subscribe. They do not open a new camera connection |
| Models | One question each. Crowd, weapon, accident, queues, and later plates, helmets, fire | A local model or a vision API. The event they emit stays the same |
| Events | A common record: camera, time, finding, clip | — |
| Command centre | Map, live counts, incident, clip, deploy buttons | The screen already started in the project workspace. It still uses scripted alerts until this path is attached |
| Deploy and signal adapters | Carry an accepted order out of the building | Screen-only in the demo. The department's dispatch system and signal controller later |
| Outcome log | Who deployed what, and the clip they saw | — |

**VMS** means the video system the city may already use to watch cameras. **ATCS** means the system that changes green times. **CAD** means the dispatch system that tasks a police or ambulance unit. None of these products is chosen. Each is a plug on the diagram above.

## How several models share one stream

A camera produces one stream. Many models need it. The gateway publishes once. Each model keeps its own pace.

- Crowd count and traffic queues need the latest frame. If a model is still busy, it skips to the newest frame. A stale count is worse than a skipped frame. The screen shows the time of the count.
- Weapon check and accident detection need a short clip, so movement is visible. They read the ten-second buffer.
- A slow model does not stop the others. If the weapon model is waiting on an API, crowd count still updates.
- Adding a model means registering another worker and its finding type. Ingest, the desk, and the log stay as they are.
- Each model sends a heartbeat. If crowd count goes quiet, that camera shows **Count delayed** instead of a number that looks live.

Working rates for the demo, to be measured on real cameras later:

- Crowd count and queue length: about every 2 seconds.
- Weapon check: on the crowd cameras, about every 2 seconds, attached to the current count.
- Accident: continuous on the road cameras, raised when the clip matches a crash.

A vision API is not called on every raw frame. The adapter sends the frame or clip the model needs, at the rate above.

### Local model or vision API

```mermaid
flowchart TB
  bus[Frame bus]
  adapter[Model adapter]
  local[Model on the police network]
  api[Vision API the department has approved]
  event[Same event either way]
  desk[Command centre]

  bus --> adapter
  adapter --> local --> event
  adapter --> api --> event
  event --> desk
```

The command centre does not know which path ran. Configuration picks the path per model:

- **Off.** That finding is hidden.
- **Local.** The model runs on machines the department controls. Video stays on that network.
- **API.** The adapter sends the picture to a vision API and maps the reply into the event. Use this in the demo on sample video. Use it on city video only after the department allows pictures to leave the building.

No API vendor is selected. The adapter is the slot where a vendor is named later.

### The event every model must produce

| Field | Meaning |
| --- | --- |
| Camera | Which stream |
| Time | When the picture was taken |
| Model | Crowd, weapon, accident, traffic, or a later model |
| Finding | People count, possible firearm, possible blade, crash, queue length per arm, suggested green seconds |
| Strength | High, or needs review |
| Clip | Pointer to the seconds the officer will watch |

An incident groups findings that share a camera and overlap in time. A crowd of 40 and a possible weapon on that camera are one incident: the count, the weapon line, one clip, one **Deploy police** button. An accident at a junction and a queue at that junction show together on the map. Ambulance deploy and the signal plan remain two actions.

## What the command centre shows

The map is the city area the demo or the deployment covers. Each camera is a point. Placeholder names are used until a real site is chosen.

| Camera kind | Always on the point | What opens an incident |
| --- | --- | --- |
| Crowd place | People count and the time of that count | Count over the limit the department sets, or a possible weapon |
| Junction | Queue length on each arm | A suggested plan that differs from the current greens, or an accident |
| Road | Last time a picture was checked | Accident |

Opening an incident shows the clip, the findings, and the actions that fit:

- Crowd or possible weapon: **Deploy police**
- Accident: **Deploy ambulance**
- Queue plan: **Accept signal plan**
- Any incident: **Dismiss**, with a reason, kept in the log

Dismiss reasons matter. They are how the department later sees false weapon alerts and false crashes.

### Crowd, then police

```mermaid
sequenceDiagram
  participant Cam as Camera
  participant Crowd as Crowd model
  participant Weapon as Weapon model
  participant Desk as Command centre
  participant Police as Police deploy

  Cam->>Crowd: latest frame
  Crowd->>Desk: 40 people
  Desk->>Desk: show 40 on the map
  Cam->>Weapon: same moment, short clip
  Weapon->>Desk: possible blade
  Desk->>Desk: one incident, count plus possible weapon
  Desk->>Police: officer presses Deploy police
  Police->>Desk: order stored, unit named when dispatch is connected
```

The count is on the map before anyone is deployed. The weapon line is added when that model speaks. The officer watches the clip, then deploys.

### Accident, then ambulance

```mermaid
sequenceDiagram
  participant Cam as Road camera
  participant Crash as Accident model
  participant Desk as Command centre
  participant Amb as Ambulance deploy

  Cam->>Crash: short clip
  Crash->>Desk: crash at this camera
  Desk->>Desk: incident with clip
  Desk->>Amb: officer presses Deploy ambulance
  Amb->>Desk: order stored, unit named when dispatch is connected
```

Under the India assumption, 112 remains the number the public calls. This incident is the command centre's earlier view of the same kind of event. Linking it to a 112 call is a later connection, not part of the demo.

### Traffic, then the lights

```mermaid
sequenceDiagram
  participant Cam as Junction camera
  participant Traffic as Traffic model
  participant Desk as Command centre
  participant Signal as Signal adapter

  Cam->>Traffic: latest frame of each arm
  Traffic->>Desk: queue lengths and suggested green seconds
  Desk->>Desk: officer reviews the picture
  Desk->>Signal: officer accepts the plan
  Signal->>Desk: advice recorded, or written to the controller when connected
```

The traffic model proposes green times so a queue is cleared before it blocks the previous junction. It does not move a light by itself. Acceptance is the officer's action. Writing to the controller waits until that controller is named and the department allows the write. A rejected or ignored plan is logged too.

## Demo now, deploy when the project is awarded

Same program. A configuration file changes the plugs. The command-centre screens stay the same, so a demo shown to the department is the system they would run, with live connections still empty.

| Plug | Demo, to show the department | Deployment, after the project is awarded |
| --- | --- | --- |
| Cameras | Three sample videos labeled as cameras: a crowd, a road, a junction. A test camera can replace a file | The department's cameras, through their VMS or a direct stream |
| Models | Demo data plays a prepared story. A file feed runs the person and vehicle detector on CPU. Weapon, crash, and plate readers are not loaded on a file | Local models on the police network, unless the department approves an API for city video |
| Map | Placeholder points. No city is drawn as if it had been chosen | The real camera locations |
| Police and ambulance | **Deploy** records the order, the officer, the time, and the clip on the incident | The same button sends the order to the dispatch system the department names |
| Signals | **Accept signal plan** stores the suggested greens. **Flag this plate** stores a complaint-list hit on the screen and does not stop a vehicle | The same signal button writes to the signal controller the department names. A plate flag follows the city's notice process |
| Accounts | One shared demo desk, labeled Police, Ambulance, or Traffic so the room can see each action | Named officers, with rights set by the department |
| Where it runs | One machine in the room is enough | The network the department requires. On-premises is available because many departments will want video to stay inside. That choice is still open |

If a model is not ready on demo day, that plug can emit timed findings from the sample video. The screen must label those **Sample findings**, so the room does not think a live model ran. As soon as an API or a local model is connected, the same incidents are model findings.

## What the police department needs in place

- The command centre runs for police, traffic, and ambulance desks. One person can hold more than one desk in a small demo.
- Video opens only for those desks. There is no public page of the streams.
- Every deploy stores the officer, the camera, the clip, the finding, and the order.
- How long video and clips are kept is the department's decision. It is not set here.
- Weapon text on screen is **Possible weapon**. The log uses that wording too.
- Signal changes and unit dispatch stay with a person at the desk. The models raise the incident and the recommended action.

## Models the architecture already has room for

The wall does not give weapon, plate, or a people count their own page. A mark is drawn on the camera that saw it. Traffic control is a separate room, because it is a plan for the lights rather than an alert on a picture.

| Mark | Colour | Where it sits | Demo | A file feed today | Desk action |
| --- | --- | --- | --- | --- | --- |
| Gathering | Amber | Crossing camera | Sudden grouping on the scramble | Sudden when the busiest frame has at least 8 people and at least twice the quietest frame | Record police |
| Watchlist | Bone | Ground camera | Box labeled demo record CV-104. Not a real person. No face model is running | Not raised. No face model is loaded | Record police |
| Possible weapon | Rose | Same crossing camera | Possible blade. False matches are expected | Not raised. This detector has no weapon class | Record police, after the picture is watched |
| Accident | Red | Road camera, brought forward | A damaged truck | Not raised. This detector has no crash class | Record ambulance. It does not call 112 |
| Red light | Signal amber | Stop-line camera | A vehicle entered on red. Not a measured violation | Not raised. No signal feed is connected | Record review |
| Plate | Teal | Same stop-line camera | `DL01CV0001`, not a real registration | Not raised. No plate reader is loaded | Flag plate. It does not stop a vehicle |
| Signal plan | Sage against stone | Traffic control | Three minutes of rotation against a longest-queue plan | The simulation does not read a clip | The plan stays on screen. It does not write to a controller |

A headcount by itself does not open a crowd alert. The crowd product is a sudden grouping. Face recognition, a weapon model, a crash model, and a plate reader are later plugs. Until they exist, the screen says so.

## What names the situation

The reading a person can defend in the room comes from the person and vehicle detector, plus the change in that count from frame to frame.

**V-JEPA** (Meta's video joint-embedding model, including V-JEPA 2) was checked as a categoriser. Its public action head is trained on Something-Something v2: hand and object actions such as "putting something into something". That label set does not contain a crash, a weapon, congestion, or a number plate. The model is hundreds of millions to about a billion parameters and is built for a GPU. It is relevant later as a video backbone, after a head is trained on city events the department cares about. It is not the thing that names a crash, a plate, or a weapon in this demo.

A **vision-language model** would write a sentence about the picture, which can help an officer understand a scene. It still must not issue the order. It also needs a GPU the department chooses, or an API, and an API only after the department allows city video to leave the building. This demo machine has no NVIDIA GPU, so no vision-language model is called and no caption is invented.

Weapon, crash, and plate stay undecided on a real clip until those models exist. The demo story is labeled **Demo data** so the room can still see the full loop.

## Two ways to show it

The wall has two modes. Switching mode clears the log and any attached clip.

**Demo** opens on the five cameras. The crash camera is outlined, then brought forward, so the room sees the wall and then the picture that needs a decision. **False match** sends that camera back. **Live** shows no prepared marks. **Read a feed** can raise a gathering from the detector. It does not invent the other marks.

Orders in both modes stay on this screen.

## Traffic control

The signal room is a simulation, because a recorded junction cannot show two timing plans at once. Both plans receive the same arrivals for 180 seconds. North arrives at 0.55 vehicles a second, south at 0.32, east at 0.18, west at 0.12. Discharge is 0.9 vehicles a second, so the junction is over capacity and both queues grow. Rotation gives each arm 15 seconds of green and 3 seconds of clearance. The AI plan serves the longest queue for 8 to 24 seconds. Over the three minutes the AI plan has the lower mean queue, the lower peak, and the higher number of vehicles cleared. `notebooks/07_signal_simulation.ipynb` prints that comparison. The same rules run in `command-centre/src/traffic/sim.ts`.

## What is still open

These do not change the diagram. They fill the plugs.

1. Which city, which cameras, and which one crowd place and which junctions are first.
2. How those cameras are reached: the existing VMS, or a direct camera stream.
3. Whether each model is local or a named vision API, and whether city video may be sent to that API.
4. Which dispatch system receives police and ambulance orders.
5. Which signal controller, if any, may receive an accepted plan.
6. Cloud, on-premises, or a mix, and who may open live video.
7. The people-count limit that opens a crowd incident, set per place after the first real pictures.

## The control room

The desk opens on the City Vigilance mark. Two rooms sit under it.

**Monitor** is a wall of five cameras. An alert outlines its camera. The crash camera is enlarged so a person can confirm it or mark a false match. Weapon and plate are chips on the camera that saw them. The watchlist box is a placement guide, not a claimed identity.

**Traffic control** is the simulation above. It is not a sixth camera.

Showcase clips, under their original licences in `command-centre/public/showcase/`:

- Crossing: Shibuya Crossing, Tokyo. Basile Morin, CC BY-SA 4.0.
- Ground: Sabana Grande boulevard, Caracas. Vicente Quintero, CC BY 3.0.
- Approach and stop line: Link Road, Cuttack. Subhashish Panigrahi, CC BY-SA 3.0.
- Road: a truck collision on the A1. CaughtOnDashcamOrCCTV, CC BY 3.0.

## Where the current screen fits

The command centre in `command-centre/` (`cd command-centre && npm run dev`, http://127.0.0.1:5173) is this demo. The model service is `python -m cityvigilance.server` on http://127.0.0.1:8765. `notebooks/06_demo_and_live.ipynb` walks a file reading and why V-JEPA is not the categoriser. `notebooks/07_signal_simulation.ipynb` is the signal comparison. City cameras, a vision API, a face model, dispatch, and a signal controller are the same plugs with nothing attached yet. Deployment changes those plugs, not the desk.

The sample models and the file detector run on the CPU of whichever machine starts them. This demo does not use a GPU and does not call a vision server. A later local model would use a GPU on a machine the department chooses. A later API model would use the provider's servers, and only if city video is allowed to leave the building.
