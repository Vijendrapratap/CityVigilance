# CityVigilance

Command-centre demo for a police and traffic desk. A camera stream feeds four separate models. The desk shows a people count, a possible weapon, an accident, and a signal plan. An officer records the order.

No city, camera brand, or model vendor is chosen.

## See the demo

Two processes. The model service reads an uploaded clip. The desk serves the page.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m cityvigilance.server
```

In a second terminal:

```bash
cd command-centre
npm install
npm run dev
```

Open http://127.0.0.1:5173

The first screen is the four departments. Open one module, upload a short clip for that use case, and run it. **Open on the desk** shows that camera with the clip instead of the sample numbers.

- **Police** and **Event security** share the crowd camera. Crowd count is people the detector can separate. Weapon check does not invent a blade: no weapon model is loaded, so the officer watches the clip.
- **Traffic** counts vehicles in the frame and stores a proof-of-concept green time. It does not measure queue metres and it does not change a signal.
- **Emergency dispatch** plays the road clip. No accident model is loaded, so a crash is not declared. Deploy ambulance stays with the officer. It does not call 112.

The **Desk** still shows the sample stream on any camera that has no clip yet:

- **CR-1** Crowd camera. The people count changes every couple of seconds. **Possible blade** is the sample weapon line. **Deploy police** records the order on the screen.
- **RD-1** Road camera. A sample crash. **Deploy ambulance** records the order. It does not call 112.
- **JN-1** Junction camera. Sample queue metres and a suggested green time. **Accept signal plan** stores the plan. It does not change a live signal.

## Where this runs

Uploaded clips are read on CPU by the model service. There is no GPU in this path, and no vision API is called.

| Piece | What it actually does |
| --- | --- |
| Command centre | A web page. Node serves the files and proxies `/api` to the model service. |
| Sample stream | Fixed numbers, used until a clip is placed on that camera. |
| Uploaded clip | YOLOv8n on CPU counts people and vehicles in up to 12 frames. Weapon and crash classes are not in this model. |
| This cloud machine | No NVIDIA GPU is installed here. |
| Your computer | Opening the page does not use your GPU. The model service uses the CPU of the machine where `cityvigilance.server` is running. |

The person and vehicle detector is the local plug, on CPU. A later model can move to a GPU on a machine the department chooses. An API plug sends the picture to a vision service only after the department allows city video to leave the building. Neither of those is connected. Weapon and accident models are still empty slots.

Check the machine you are on:

```bash
python3 -m cityvigilance
```

## Work on one model at a time

The notebooks are the testing bench. Each one runs a single model and checks the event the desk expects.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter lab notebooks
```

| Notebook | Model | Question it answers |
| --- | --- | --- |
| `notebooks/00_where_this_runs.ipynb` | All four | Where the code is running, and what an event looks like |
| `notebooks/01_crowd_count.ipynb` | Crowd | How many people are at the crowd camera? |
| `notebooks/02_weapon_check.ipynb` | Weapon | Is there a possible firearm or blade? |
| `notebooks/03_accident.ipynb` | Accident | Is there a crash? |
| `notebooks/04_traffic_queues.ipynb` | Traffic | How long is each queue, and what green time clears it? |
| `notebooks/05_clip_per_module.ipynb` | One uploaded clip | The event a department module returns after a video |

Replace the sample function inside a notebook when you have a real model. Keep the same event shape. The desk does not need to change.

```bash
python3 -m unittest tests/test_sample_models.py
cd command-centre && npm test
```

## Layout

```text
README.md                 this page
docs/system-architecture.md
command-centre/           departments, module clips, and the desk
cityvigilance/            sample models, clip analyzer, model service
cityvigilance/models/     downloaded detector weights, not committed
notebooks/                one bench per model
tests/                    sample models and clip results
```

The architecture, including demo versus a later police deployment, is in `docs/system-architecture.md`.

## Put this on GitHub

This folder is ready to publish. Creating the remote needs a GitHub login on your machine. The build machine used for this demo is not signed in, so no remote was created from here.

A police desk demo is safer as a **private** repository. Invite the people you want to show it to.

```bash
gh auth login
gh repo create cityvigilance --private --source=. --remote=origin --push
```
