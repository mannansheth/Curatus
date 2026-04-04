# 🚀 Project Setup Guide

Follow these steps to run the project locally.

---

## 1. Clone or Download

- Fork the repository OR download ZIP  
- Open the project folder in **VS Code**

---

## 2. Start Frontend (React)

Open terminal:

cd frontend  
npm install  
npm start  

---

## 3. Setup Database (MySQL)

- Navigate to: `backend/config/db.sql`  
- Open MySQL (Workbench / CLI)  
- Import/run the `db.sql` file  

---

## 4. Start Backend (Node.js)

Open a new terminal:

cd backend  
npm install  
npm start  

---

## 5. Start Python Service (Flask)

Open another new terminal:

cd backend-py  

# create virtual environment  
python -m venv venv  

# activate (Windows)  
venv\Scripts\activate  

# install dependencies  
pip install -r requirements.txt  

# run server  
python app.py  

---

## ⚠️ Important Notes

- Ensure **MySQL is running**  
- Update DB credentials in backend `.env` if required  
- Default Ports:  
  - Frontend → http://localhost:3000  
  - Backend → http://localhost:5000  
  - Python Service → http://localhost:5001  

---

## ✅ First-Time Setup vs Daily Run

First time only:

npm install  
pip install -r requirements.txt  

Every time you run:

npm start  
python app.py  

---

## 🛠 Troubleshooting

- If `venv\Scripts\activate` fails → use PowerShell as Admin  
- If ports are busy → change port in config files  
- If MySQL errors → verify DB name, user, and password  

---

## 📌 Tech Stack

- Frontend: React  
- Backend: Node.js + Express  
- Python Service: Flask  
- Database: MySQL  

---

## 👨‍💻 Notes

- Do NOT commit `node_modules/` or `venv/`  
- Only commit:
  - `package.json`
  - `requirements.txt`
