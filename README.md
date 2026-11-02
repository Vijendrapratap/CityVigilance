# CityVigilance

A control room for cameras and signals. The home mark opens two rooms: **Monitor**, a wall of cameras, and **Traffic control**, a simulation of equal rotation against an AI plan. A person confirms before police, an ambulance, a review, or a plate flag is recorded.

No city, camera brand, or model vendor is chosen.

## See the demo

Two processes. The desk serves the page. The model service reads a file feed.

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

The home page is the mark. **Monitor** is the camera wall. **Traffic control** is the signal simulation.

On the wall, every camera stays up. A crash, a sudden grouping, a watchlist box, a possible weapon, a red-light pass, or a complaint plate is drawn on that camera in its own colour. The crash screen comes forward on its own, so the picture can be judged. **False match** returns it to the wall. **Record ambulance**, **Record police**, **Record review**, and **Flag plate** stay on this screen. They do not call 112, radio a unit, stop a vehicle, or write to a signal.

Weapon and plate are marks on a camera, not their own pages. A people count is not the crowd product. The crowd mark is a sudden grouping. The watchlist box is a demo record, `CV-104`, and it is not a real person. No face model is running.

**Live** clears the story. A camera shows a reading only after **Read a feed**. The detector can raise a gathering from a jump in the people it can separate. It does not invent a weapon, a face, a plate, or a crash.

Traffic control runs both plans on one junction for three minutes. North is the heavy approach. Rotation gives every arm the same green. The AI plan serves the longest queue. The AI plan holds a smaller queue and clears more vehicles. Nothing is sent to a controller. `notebooks/07_signal_simulation.ipynb` prints the same comparison.

Showcase clips, kept under their original licences in `command-centre/public/showcase/`:

- **Crossing:** Shibuya Crossing, Tokyo. Basile Morin, CC BY-SA 4.0.
- **Ground:** Sabana Grande boulevard, Caracas. Vicente Quintero, CC BY 3.0.
- **Approach and stop line:** Link Road, Cuttack. Subhashish Panigrahi, CC BY-SA 3.0.
- **Road:** a truck collision on the A1. CaughtOnDashcamOrCCTV, CC BY 3.0. The end card is cropped out.

## Where this runs

Uploaded clips are read on CPU by the model service. There is no GPU in this path, and no vision API is called.

| Piece | What it actually does |
| --- | --- |
| Command centre | Home, the camera wall, and the signal simulation. Node serves the files and proxies `/api` to the model service. |
| Demo | Prepared marks on the wall, so the room can see an alert come forward before a camera exists. |
| Live | No prepared marks. A gathering appears only after a file is read. |
| File feed | YOLOv8n on CPU. A sudden jump in people can raise a gathering. Weapon, face, plate, and crash are not in this model. |
| Signal simulation | Equal rotation against a longest-queue plan. It does not read a video. |
| This machine | No NVIDIA GPU is installed here. |
| Your computer | Opening the page does not use your GPU. The model service uses the CPU of the machine where `cityvigilance.server` is running. |

V-JEPA was checked as a way to categorise a clip. Its public action head labels hand and object actions, such as "putting something into something". It does not name a crash, a plate, congestion, or a weapon, and it wants a GPU. It can be a later video backbone after a city-trained head. It is not used here.

A vision-language model would write a sentence about the picture. That sentence would still not issue an order, and it does not run on this CPU. Weapon, crash, and plate stay with the officer until those models exist.

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

| Notebook | What it answers |
| --- | --- |
| `notebooks/00_where_this_runs.ipynb` | Where the code is running, and the six sample events |
| `notebooks/01_crowd_count.ipynb` | How many people are at the crowd camera? |
| `notebooks/02_weapon_check.ipynb` | Is there a possible firearm or blade? |
| `notebooks/03_accident.ipynb` | Is there a crash? |
| `notebooks/04_traffic_queues.ipynb` | How long is each queue, and what green time clears it? |
| `notebooks/05_clip_per_module.ipynb` | The event a file feed returns for each module |
| `notebooks/06_demo_and_live.ipynb` | Demo data versus a live file, and why V-JEPA is not the categoriser |
| `notebooks/07_signal_simulation.ipynb` | Equal rotation against the AI plan on one junction |

Replace the sample function inside a notebook when you have a real model. Keep the same event shape. The desk does not need to change.

```bash
python3 -m unittest tests/test_sample_models.py tests/test_analyze.py
cd command-centre && npm test
```

## Layout

```text
README.md                 this page
docs/system-architecture.md
command-centre/           home, camera wall, and signal simulation
cityvigilance/            sample models, clip analyzer, model service
cityvigilance/models/     downloaded detector weights, not committed
notebooks/                one bench per model, plus the demo-and-live walkthrough
tests/                    sample models and clip results
```

The architecture, including demo versus a later police deployment, is in `docs/system-architecture.md`.

## Repository

https://github.com/Vijendrapratap/CityVigilance
