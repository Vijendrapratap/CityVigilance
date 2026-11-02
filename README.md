# CityVigilance

Command-centre demo for a police and traffic desk. A camera stream feeds four separate models. The desk shows a people count, a possible weapon, an accident, and a signal plan. An officer records the order.

No city, camera brand, or model vendor is chosen.

## See the demo

```bash
cd command-centre
npm install
npm run dev
```

Open http://127.0.0.1:5173

You should see three incidents:

- **CR-1** Crowd camera. The people count changes every couple of seconds. **Possible blade** stays on that incident. **Deploy police** records the order on the screen.
- **RD-1** Road camera. A crash. **Deploy ambulance** records the order. It does not call 112.
- **JN-1** Junction camera. Queue length and a suggested green time for each arm. **Accept signal plan** stores the plan. It does not change a live signal.

## Where this runs

The demo does **not** use a GPU, and it does **not** call a vision server.

| Piece | What it actually does |
| --- | --- |
| Command centre | A web page. Node only serves the files. |
| Crowd, weapon, accident, traffic | Sample functions. They return a fixed list of numbers. They do not look at a picture. |
| This cloud machine | No NVIDIA GPU is installed here. PyTorch is not installed. |
| Your computer | Watching the demo from Cursor does not use your GPU. If you clone this repo and run it yourself, the sample models still use the CPU only. |

A real model has two later plugs, and neither is connected:

- **Local.** The model runs on a machine you choose. That is where a GPU would be used.
- **API.** The picture goes to a vision service the department approves. That work runs on the provider's servers, and only if city video is allowed to leave the building.

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

Replace the sample function inside a notebook when you have a real model. Keep the same event shape. The desk does not need to change.

```bash
python3 -m unittest tests/test_sample_models.py
cd command-centre && npm test
```

## Layout

```text
README.md                 this page
docs/system-architecture.md
command-centre/           the desk you show people
cityvigilance/            Python models the notebooks import
notebooks/                one bench per model
tests/                    checks that the sample models keep their shape
```

The architecture, including demo versus a later police deployment, is in `docs/system-architecture.md`.

## Put this on GitHub

This folder is ready to publish. Creating the remote needs a GitHub login on your machine. The build machine used for this demo is not signed in, so no remote was created from here.

A police desk demo is safer as a **private** repository. Invite the people you want to show it to.

```bash
gh auth login
gh repo create cityvigilance --private --source=. --remote=origin --push
```
