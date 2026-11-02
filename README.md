# CityVigilance

One command picture for a police, traffic, and emergency desk. Six modules sit on one screen, each with its own colour. A person confirms before police, an ambulance, a signal plan, or a plate flag is recorded.

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

The page opens on **Demo data**. The story is already on screen, so a room can watch it without a camera:

| Module | Colour | What you see | Confirm |
| --- | --- | --- | --- |
| Crowd | Amber | A people count on Crowd camera 1 | Deploy police |
| Movement | Violet | Sudden, marked for review | Same police order |
| Weapon | Rose | Possible blade. False matches are expected | Same police order |
| Accident | Red | A crash on Road camera 1 | Deploy ambulance. This does not call 112 |
| Traffic | Blue | A longer green on the north approach | Accept signal plan. This does not change a light |
| Plates | Teal | `DL01CV0001`, a demo complaint, not a real registration | Flag this plate. This does not stop a vehicle |

The showcase picture plays with that story. **Watch showcase clip** reloads it. The numbers stay the prepared story until you choose **Read a feed**.

**Live pipeline** turns the demo numbers off. The rail says Waiting until you choose **Read a feed**. A city camera is not connected. The file is read on CPU: people and vehicles come from YOLOv8n. Movement is a jump in that count. Weapon, crash, and plate stay undecided, because this detector cannot see them, and the screen does not invent them.

Switching mode clears the log and any attached clip, so the two stories do not mix.

Showcase clips, kept under their original licences in `command-centre/public/showcase/`:

- **Crowd, movement, and weapon:** people on the Sabana Grande boulevard, Caracas. Vicente Quintero, CC BY 3.0.
- **Traffic and plates:** Link Road, Cuttack. Subhashish Panigrahi, CC BY-SA 3.0.
- **Accident:** a truck collision on the A1. CaughtOnDashcamOrCCTV, CC BY 3.0. The wreck is visible. The accident model still leaves the decision with the officer.

## Where this runs

Uploaded clips are read on CPU by the model service. There is no GPU in this path, and no vision API is called.

| Piece | What it actually does |
| --- | --- |
| Command centre | One screen. Node serves the files and proxies `/api` to the model service. |
| Demo data | Fixed numbers, so the room can see every module before a camera exists. |
| Live pipeline | No sample numbers. A reading appears only after a file is read. |
| File feed | YOLOv8n on CPU counts people and vehicles in up to 12 frames. |
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

Replace the sample function inside a notebook when you have a real model. Keep the same event shape. The desk does not need to change.

```bash
python3 -m unittest tests/test_sample_models.py tests/test_analyze.py
cd command-centre && npm test
```

## Layout

```text
README.md                 this page
docs/system-architecture.md
command-centre/           the command picture
cityvigilance/            sample models, clip analyzer, model service
cityvigilance/models/     downloaded detector weights, not committed
notebooks/                one bench per model, plus the demo-and-live walkthrough
tests/                    sample models and clip results
```

The architecture, including demo versus a later police deployment, is in `docs/system-architecture.md`.

## Repository

https://github.com/Vijendrapratap/CityVigilance
