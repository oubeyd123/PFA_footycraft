# ⚡ Footycraft | The Ultimate Football Management & Community Platform

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**Footycraft** is a high-performance, full-stack fantasy football application mixing squad building, competitive match simulation, and live community trends. Build your dream team, open chests, analyze the meta, and compete.

---

## 🚀 Key Features

### 🛡️ Core Gameplay
*   **Dynamic Squad Builder:** Build a starting XI with live Chemistry and Overall Rating (OVR) calculations based on player nations, leagues, and clubs.
*   **Chest & Inventory System:** Open bronze, silver, and gold chests. Manage your club's players, trade, and upgrade your squad.
*   **Match Simulation:** Challenge opponents in Quickmatches, Seasons, and Tournaments with simulated statistical outcomes.
*   **Dynamic SBCs (Challenges):** Complete tactical squad building challenges to earn exclusive rewards.

### 📊 Live Analytics & Trends
*   **🔥 Meta Pulse:** Real-time tracking of the most effective and trending formations globally. Analyzes average chemistry, win rates, and community engagement.
*   **🌟 Squad Spotlight:** A live showcase of the most viewed and liked public squads. Get inspired by the community's top tacticians.

### 🌍 Community & Engine
*   **Interactive Social Feed:** Post squads, share strategies, and interact with other managers in a fully integrated community tab.
*   **Automated Python Moderation:** A dedicated containerized Python NLP microservice automatically intercepts and sanitizes toxic language before it ever hits the feed.
*   **News & NLP Engine:** Python-powered news aggregation to keep the dashboard alive with real-world football context.

---

## 🛠️ Architecture & Tech Stack

Footycraft uses a hybrid monolithic-microservice approach, utilizing the best tools for the job:

*   **Core Backend (PHP 8.2):** Handles lightning-fast REST API routing, user authentication, lineup logic, chemistry math, and match simulation.
*   **Data & NLP Services (Python 3):** Powers real-time content moderation (`BadWordDetector`), massive player data ingestion scripts, and News Search indexing.
*   **Database (PostgreSQL 16):** Highly relational schema handling millions of simulated matches, player assets, and community interactions.
*   **Frontend:** Pure, unopinionated HTML5, CSS3, and Vanilla JavaScript for a blazing fast, zero-dependency client experience.
*   **Infrastructure:** Fully containerized with `docker-compose` for instant, isolated local development.

---

## ⚙️ Quick Start (Docker)

To get Footycraft running locally, you only need Docker installed. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yassinesaidi-19/PFA_footycraft.git
   cd PFA_footycraft
   ```

2. **Spin up the stack:**
   ```bash
   docker-compose up -d --build
   ```

3. **Seed Database (Optional - Loads player packs & users):**
   ```bash
   docker-compose run seed-all
   ```

**Services running:**
*   Frontend & PHP API: `http://localhost:5000`
*   Python NLP/News API: `http://localhost:8000`
*   PostgreSQL DB: `localhost:5432`

---

## 📂 Repository Structure

```text
📂 PFA_footycraft
 ┣ 📂 api/                # Python Flask Microservices (News, NLP)
 ┣ 📂 backend/php/        # Core PHP Backend & API Controllers
 ┣ 📂 detector/           # Automated Content Moderation Engine
 ┣ 📂 frontend/           # HTML/Vanilla JS/CSS Client
 ┣ 📂 schema/             # PostgreSQL Database Schemas
 ┣ 📂 scripts/            # Python Data Ingestion & Seeding Scripts
 ┣ 📜 docker-compose.yml  # Docker Orchestration
 ┗ 📜 Dockerfile          # Hybrid PHP + Python Environment Build
```

---

## 📸 Screenshots


### **1. The Dashboard & Squad Spotlight**
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/8cbc1b22-8942-4b8c-a975-1eac8d5aeb10" />
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/e5980a6b-3485-43ef-88c7-8d61ab1c1d9a" />



### **2. Meta Pulse Analytics & Trending Players Viewer:**
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/defa2b45-d1df-4ced-a3dd-a437782f9834" />
<img width="1919" height="1078" alt="image" src="https://github.com/user-attachments/assets/1160983f-4cae-497a-b6a0-255fb5adecaf" />



### **3. Lineup Builder & Chemistry & Kick Off Modes:**
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/001c6553-d387-41c1-a7ca-8257e5a5e709" />
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/abc3e200-d1b2-4bce-b878-c3d532276f46" />




### **4. Live Community Feed**
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/1310c7e3-1f19-44ec-8e5e-f98a09aaf5ed" />


---
*Built with ❤️ for the love of the game.*
