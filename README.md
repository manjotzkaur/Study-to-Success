# 🎓 Study to Success

A full-stack web application designed to help students manage their academic activities in an organized and efficient way.
The application allows users to manage subjects, tasks, and exams while tracking their overall progress through a dashboard and visual analytics.

---

## 🔗 Live Demo

 https://study-to-success-h4pm.onrender.com

---

## 📖 Project Overview

This application provides a centralized system where students can plan and monitor their study activities.
It focuses on improving productivity by combining task management, exam scheduling, and progress tracking in one platform.

---

## 🚀 Key Features

### 📚 Subject Management

* Add and manage subjects with descriptions

### 📝 Task Management

* Create, update, and delete tasks linked to subjects
* Track task status (completed, pending, due)

### 📅 Exam Management

* Add exams with date, time, and location
* Edit and delete exam details
* Track upcoming and completed exams

### 📊 Dashboard and Analytics

* View overall progress through charts (bar and pie)
* Monitor completed and pending work

### 📆 Calendar View

* Display tasks and exams in a calendar format

### ⏱️ Study Timer

* Track study time to improve focus and consistency

### ⚙️ User Settings

* View profile details
* Enable dark mode

---

## 🛠️ Technology Stack

| Category   | Technology                               |
| ---------- | ---------------------------------------- |
| Frontend   | HTML, CSS (Bootstrap), JavaScript        |
| Backend    | Node.js, Express.js                      |
| Database   | MySQL (Railway)                          |
| Deployment | Render (Application), Railway (Database) |

---

## 📂 Project Structure

```
study-to-success/
│
├── backend/
│   ├── routes/
│   ├── utils/
│   ├── .env
│   ├── database.js
│   ├── server.js
│   ├── package.json
│
├── frontend/
│   ├── css/
│   ├── js/
│   │   ├── calendar.js
│   │   ├── dashboard.js
│   │   ├── exams.js
│   │   ├── progress.js
│   │   ├── settings.js
│   │   ├── subjects.js
│   │   ├── task.js
│   │
│   ├── index.html
│   ├── dashboard.html
│   ├── subjects.html
│   ├── task.html
│   ├── exam.html
│   ├── progress.html
│   ├── calendar.html
│   ├── settings.html
│   ├── login.html
│   ├── signup.html
│   ├── analytics.html
│
├── study2success.sql
```

---

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/manjotzkaur/Study-to-Success
cd study-to-success/backend
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Database

Create a `.env` file in the backend folder and add:

```
DB_HOST=your_host
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
DB_PORT=your_port
```

You can use:

* Railway MySQL (recommended)
* or Local MySQL with `study2success.sql` file

---

### 4. Run the Application

```bash
node server.js
```

---

### 5. Access the Application

Open your browser and go to:
http://localhost:3000

---

## 🌐 Usage

* Register or log in
* Add subjects and related tasks
* Schedule exams
* Track progress through the dashboard
* Use the study timer to stay focused
* View tasks and exams in the calendar

---

## 💡 Future Enhancements

* AI-based study recommendations
* Notes management system
* AI-generated question papers
* Improved mobile responsiveness

---

