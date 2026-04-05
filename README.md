# 🚀 Project Setup Guide

Follow these steps to run and contribute to the project locally.

---

## 1. Clone Repository (You are a collaborator)

Do NOT fork. Clone the main repo directly:

- git clone https://github.com/mannansheth/Curatus
- cd Curatus 

Open the project folder in **VS Code**

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

## 🔁 How to Contribute (IMPORTANT)

1. Always pull latest code before starting:

git pull origin main  

2. Create a new branch:

git checkout -b feature-name  

3. Make your changes  

4. Commit and push:

git add .  
git commit -m "your message"  
git push origin feature-name  

5. Go to GitHub → Click **Compare & Pull Request**

6. Create PR → wait for review → merge  

---

## ⚠️ Rules

- Do NOT push directly to `main`  
- Always create a branch  
- Always create a Pull Request  
- Keep commits clean and meaningful  

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
