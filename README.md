# MayProHR

Professional Human Resources system for face-based attendance and related services.

Repository: https://github.com/BuiCongTu/MayPayHR.git

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup & Run](#setup--run)
    - [1. Python Face Attendance API](#1-python-face-attendance-api)
    - [2. Spring Boot Backend](#2-spring-boot-backend)
    - [3. React Web Frontend](#3-react-web-frontend)
    - [4. Flutter Mobile App](#4-flutter-mobile-app)
- [Configuration & API Keys](#configuration--api-keys)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview
MayProHR is a multi-component application that includes:
- A Python-based face attendance API,
- A Spring Boot backend,
- A React web frontend,
- A Flutter mobile client.

## Architecture
- `face_attendant_svm` — Python service for face recognition / attendance.
- `springbootapp` — Java Spring Boot backend and API.
- `reactapp` — React web interface.
- `flutterapp` — Flutter mobile application.

## Prerequisites
- macOS or Linux (Windows instructions provided where needed)
- Node.js & npm
- Java 17+ and Maven/Gradle (project uses Maven wrapper)
- Python 3.8+ and pip
- Flutter SDK
- Git

## Setup & Run

### 1. Python Face Attendance API
macOS / Linux:
```bash
cd face_attendant_svm
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_api.txt
bash startPythonApi.sh
````

Windows (PowerShell/CMD):
```bash
cd face_attendant_svm
python3 -m venv venv
venv\Scripts\activate
pip install -r requirements_api.txt
bash startPythonApi.sh
```

###2. Spring Boot Backend
```bash
cd springbootapp
./mvnw spring-boot:run
```

### 3. React Web Frontend
```bash
cd reactapp
npm install
npm start
```
###4. Flutter mobile app
```bash
cd flutterapp
flutter pub get
```
list available emulators
```bash
flutter emulators
```
launch emulator and run app
```bash
flutter emulators --launch Medium_Phone_2
flutter devices
cd flutterapp
flutter run -d emulator-5554
```
## Environment & Ports (Typical)
Your configuration may vary depending on `application.properties` and React proxy.

- React: `http://localhost:3000`
- Spring Boot: commonly `http://localhost:9999` (check logs / config)
- Python Face API: depends on script configuration
---
