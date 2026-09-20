# 🎓 MockMate - End-to-End Application Flow & User Journey Guide

> **Welcome Reviewer!**  
> This document provides a complete, simple, non-technical walkthrough of **MockMate**—a smart campus peer-to-peer mock interview and assessment platform. It explains how administrators set up the platform, how students book and participate in real-time practice interviews, and how faculty supervise sessions and maintain safety standards.

---

## 📋 Table of Contents
1. [System Overview & Architecture Core](#1-system-overview--architecture-core)
2. [Phase 1: Administrator Operations & Curriculum Configuration](#phase-1-administrator-operations--curriculum-configuration)
   - [Step 1.1: System Analytics Overview](#step-11-system-analytics-overview)
   - [Step 1.2: Configuring Interview Domains & Tracks](#step-12-configuring-interview-domains--tracks)
   - [Step 1.3: Defining Level Progression Tiers](#step-13-defining-level-progression-tiers)
   - [Step 1.4: Managing Problem Banks & Test Cases](#step-14-managing-problem-banks--test-cases)
   - [Step 1.5: Setting Up Peer Feedback Rubrics & Weightage](#step-15-setting-up-peer-feedback-rubrics--weightage)
   - [Step 1.6: Scheduling Physical Exam Slots & Venues](#step-16-scheduling-physical-exam-slots--venues)
   - [Step 1.7: Managing Room Rosters & Seat Allocations](#step-17-managing-room-rosters--seat-allocations)
3. [Phase 2: Student Reservation & Physical Attendance Check-In](#phase-2-student-reservation--physical-attendance-check-in)
   - [Step 2.1: Student Slot Reservation](#step-21-student-slot-reservation)
   - [Step 2.2: Physical Venue Attendance Verification](#step-22-physical-venue-attendance-verification)
4. [Phase 3: Live Anonymous Peer Interview Experience](#phase-3-live-anonymous-peer-interview-experience)
   - [Step 3.1: Student Performance Dashboard](#step-31-student-performance-dashboard)
   - [Step 3.2: Live MCQ Assessment & Real-Time Observer View](#step-32-live-mcq-assessment--real-time-observer-view)
   - [Step 3.3: System Design Interview & Whiteboard Studio](#step-33-system-design-interview--whiteboard-studio)
   - [Step 3.4: Database Engineering & Live SQL Studio](#step-34-database-engineering--live-sql-studio)
   - [Step 3.5: Frontend Web Development & Live Component Studio](#step-35-frontend-web-development--live-component-studio)
5. [Phase 4: Supervision, Leaderboard & Safety Audit](#phase-4-supervision-leaderboard--safety-audit)
   - [Step 4.1: Faculty Live Interview Monitoring Console](#step-41-faculty-live-interview-monitoring-console)
   - [Step 4.2: Student Leaderboard & Performance Ranking](#step-42-student-leaderboard--performance-ranking)
   - [Step 4.3: Comprehensive Interview History Records](#step-43-comprehensive-interview-history-records)
   - [Step 4.4: Safety Violation Audit & Anonymity Reporting](#step-44-safety-violation-audit--anonymity-reporting)
   - [Step 4.5: Admin Audio Dialogue Player & Incident Verification](#step-45-admin-audio-dialogue-player--incident-verification)

---

## 1. System Overview & Architecture Core

**MockMate** is designed to solve a fundamental campus challenge: helping students build real-world interview confidence by pairing them anonymously to interview one another in specialized domains (Coding, System Design, SQL Databases, Frontend Development). 

The platform guarantees **fairness, privacy, and accountability** through:
- **Physical Venue Gatekeeping:** Students must physically check in at assigned campus rooms (e.g., Auditorium or Library) before digital sessions unlock.
- **Double-Blind Anonymity:** Student identities remain hidden during peer interviews to prevent bias or collusion.
- **Interactive Multi-Mode Studios:** Specialized workspaces (interactive whiteboards, live SQL sandboxes, React emulators) tailored to each interview domain.
- **Safety Auditing & Voice Monitoring:** Live dialogue audio is recorded and monitored so administrators can review flagged incidents (e.g., attempting to reveal real names).

---

## Phase 1: Administrator Operations & Curriculum Configuration

Administrators configure the entire campus interview environment—setting up subject tracks, uploading practice problems, defining peer grading criteria, and scheduling exam slots in physical campus venues.

---

### Step 1.1: System Analytics Overview

![Admin Analytics Dashboard](images/Screenshot%202026-09-20%20140125.png)

- **What is shown:** The high-level command center for system administrators. It displays total registered candidates, completed mock sessions, accumulated practice hours, class average scores, active question bank counts, and overall rubric scores across key competencies.
- **Simple Explanation:** Think of this as the campus principal's dashboard. At a glance, administrators can see how well the student body is performing across all interview tracks (Technical knowledge, Communication, Logical reasoning, and Answering quality).
- **What happens next:** The administrator selects **Interview Configuration** from the left navigation bar to set up or update learning domains.

---

### Step 1.2: Configuring Interview Domains & Tracks

![Interview Domains & Tracks](images/Screenshot%202026-09-20%20140145.png)

- **What is shown:** A catalog of all available interview subjects (Tracks) available on campus, such as *Data Structures & Algorithms*, *System Design & Architecture*, *Database Engineering & SQL*, *Frontend Development*, *Backend APIs*, and *Computer Science Fundamentals*.
- **Simple Explanation:** This is where administrators organize the subject catalog. Each subject card shows how many levels and questions are currently active and allows administrators to turn subjects on or off with a single toggle.
- **What happens next:** Clicking **Configure** on a specific subject (e.g., *Data Structures & Algorithms*) opens its multi-level progression tiers.

---

### Step 1.3: Defining Level Progression Tiers

![Progression Tiers](images/Screenshot%202026-09-20%20140154.png)

- **What is shown:** The step-by-step difficulty tiers configured for a selected domain. For example, *Level 1 (Arrays & Strings)*, *Level 2 (Trees & Graphs)*, and *Level 3 (Dynamic Programming)*.
- **Simple Explanation:** Just like in a video game where players unlock harder levels as they improve, students must progress through tiered levels. Administrators can define how long each level's interview lasts (e.g., 45 minutes) and how many questions are presented per session.
- **What happens next:** Clicking on any active level opens its underlying question bank.

---

### Step 1.4: Managing Problem Banks & Test Cases

![Question Bank Management](images/Screenshot%202026-09-20%20140208.png)

- **What is shown:** The list of practice problems assigned to a specific level (e.g., *"Contains Duplicate"* and *"First Unique Character"*). Shows difficulty labels, test cases, time limits, and controls for bulk-uploading or editing questions.
- **Simple Explanation:** This is the question vault. Administrators can add new coding challenges, set expected inputs/outputs, and activate or deactivate questions for upcoming mock interview sessions.
- **What happens next:** Next, administrators navigate to **Peer Feedback Config** to customize how students evaluate each other.

---

### Step 1.5: Setting Up Peer Feedback Rubrics & Weightage

![Peer Feedback Config](images/Screenshot%202026-09-20%20140246.png)

- **What is shown:** The feedback editor where admins build evaluation questionnaires and set point values (+2, +4, +6, +8, +10 points). A live preview on the right shows exactly how the peer feedback dialog will look to students.
- **Simple Explanation:** After finishing a mock interview, candidates grade each other's performance. Here, administrators set the exact criteria (e.g., *"How well did the student explain their reasoning?"*) and assign score weightages that contribute to student rankings.
- **What happens next:** Once curriculum rules are set, administrators schedule physical interview slots on campus.

---

### Step 1.6: Scheduling Physical Exam Slots & Venues

![Venues & Slot Scheduling](images/Screenshot%202026-09-20%20140332.png)

- **What is shown:** The venue and time slot management dashboard showing upcoming physical interview events (e.g., Sept 21, 09:00 AM - 10:00 AM) and booking fill rates.
- **Simple Explanation:** MockMate combines digital practice with real physical attendance. Administrators create official time slots and assign them to physical campus locations like the Main Auditorium or Digital Library.
- **What happens next:** Clicking **View Full Details** opens room-level seating and supervisor assignments.

---

### Step 1.7: Managing Room Rosters & Seat Allocations

![Slot Roster Control](images/Screenshot%202026-09-20%20140344.png)

- **What is shown:** Detailed venue breakdown for a scheduled slot. Shows room capacities (50 seats in Auditorium, 50 seats in Library), assigned faculty invigilators (Faculty 1, Faculty 2), candidate booking counts, and live seat occupancy meters.
- **Simple Explanation:** Administrators can see room availability and verify which faculty member is supervising which room. Candidate room details remain hidden from students until published to maintain security.

---

## Phase 2: Student Reservation & Physical Attendance Check-In

Students register for upcoming slots online, report to their assigned campus room in person, and have their attendance verified by faculty before being allowed into the digital interview room.

---

### Step 2.1: Student Slot Reservation

![Student Bookings](images/Screenshot%202026-09-20%20142933.png)

- **What is shown:** The **My Bookings** page on the student portal. Displays date, time, assigned campus venue, assigned faculty supervisor, and an **Attendance Pending** status badge.
- **Simple Explanation:** Students can view their scheduled interviews. The "Attendance Pending" warning lets students know they must physically walk to the campus venue before their interview session can begin.
- **What happens next:** The student physically goes to the assigned venue (e.g., Vedhanayagam Auditorium).

---

### Step 2.2: Physical Venue Attendance Verification

![Faculty Attendance Console](images/Screenshot%202026-09-20%20143000.png)

- **What is shown:** The console used by faculty supervisors present in the physical room. Faculty search for students by Roll Number/Name and mark them as **Present**, **Late**, or **Absent**.
- **Simple Explanation:** Think of this as the teacher taking roll call at the door. Once the faculty member clicks **Present**, the system automatically unlocks the student's digital interview gate. If a student is absent, they cannot participate.
- **What happens next:** With attendance confirmed, both paired students unlock their session and enter the live interactive interview studio.

---

## Phase 3: Live Anonymous Peer Interview Experience

Once inside, paired students conduct a structured, two-round interview (where Student A interviews Student B, then they switch roles). They communicate via built-in WebRTC voice channels while working in specialized visual studios.

---

### Step 3.1: Student Performance Dashboard

![Student Dashboard](images/Screenshot%202026-09-20%20141426.png)

- **What is shown:** The candidate's main dashboard summarizing total points earned, average points per interview, total completed sessions, letter grade (e.g., *Proficient (B)*), skill strength charts, and a prominent **Join Mock Interview** button.
- **Simple Explanation:** Students track their personal growth and preparation progress over time. When it's time for an interview, clicking "Join Mock Interview" places them directly into their assigned live session room.

---

### Step 3.2: Live MCQ Assessment & Real-Time Observer View

![Live MCQ Peer Assessment](images/Screenshot%202026-09-20%20142904.png)

- **What is shown:** The interviewer candidate's screen during a live Multiple-Choice Question (MCQ) assessment round. The interviewer sees the candidate's selected choice live, alongside official scoring guides, target benchmark answers, and explanation rationale. Voice audio indicators and mic mute buttons are active at the top.
- **Simple Explanation:** While Student B answers a problem, Student A acts as the interviewer observer. Student A sees the candidate's answer choice update live on screen and is provided with the official solution key so they can guide the discussion effectively.

---

### Step 3.3: System Design Interview & Whiteboard Studio

#### 3.3a: Session Room & Scenario Overview
![System Design Overview Room](images/Screenshot%202026-09-20%20142005.png)

- **What is shown:** The landing workspace for a System Design interview (e.g., *"Design a Distributed URL Shortener"*). Displays problem context, traffic scale limits (500M URLs/month), live peer audio connection status, and a button to launch the **Architecture Whiteboard Studio**.

#### 3.3b: Interactive System Architecture Whiteboard
![System Design Whiteboard Studio](images/Screenshot%202026-09-20%20142116.png)

- **What is shown:** A full-screen drag-and-drop architectural diagramming workspace. Candidates connect components such as Web Clients, API Gateways, Backend Microservices, Relational Databases, and Cache Stores using labeled protocols (HTTPS/REST, Direct TCP).
- **Simple Explanation:** For high-level engineering roles, candidates must design complex systems visually. This digital whiteboard lets candidates draw architectural blueprints live while discussing trade-offs over voice with their peer interviewer.

---

### Step 3.4: Database Engineering & Live SQL Studio

#### 3.4a: Database Session Landing Room
![Database Interview Room](images/Screenshot%202026-09-20%20142222.png)

- **What is shown:** The problem workspace for database engineering (e.g., *"E-Commerce Customer Order Analytics"*). Outlines database requirements and links to the **Database Studio**.

#### 3.4b: Live MySQL Query Editor & Sandbox
![SQL Query Sandbox Editor](images/Screenshot%202026-09-20%20142247.png)

- **What is shown:** An integrated SQL editor on the left and a live database sandbox view on the right. Candidates write table creation statements and complex SQL query joins, execute them in real-time against an isolated MySQL 8.0 sandbox, and view data table results.

#### 3.4c: Automatic ER Diagram Generator
![Interactive ER Diagram](images/Screenshot%202026-09-20%20142300.png)

- **What is shown:** An automatically generated Entity-Relationship (ER) diagram created directly from the candidate's written SQL code. It visually connects tables like `users`, `orders`, and `order_items` with foreign key relationship lines (`1:N`).
- **Simple Explanation:** Instead of just writing code blindly, candidates can instantly see a visual map of how their database tables relate to one another, making it easy to spot missing keys or incorrect joins.

---

### Step 3.5: Frontend Web Development & Live Component Studio

#### 3.5a: Frontend Problem Statement Workspace
![Frontend Interview Room](images/Screenshot%202026-09-20%20142356.png)

- **What is shown:** The scenario workspace for Frontend Development (e.g., *"Product Search and Category Filter"* using React 18 & Tailwind CSS).

#### 3.5b: Live Mobile Device Emulation
![Frontend Mobile Preview](images/Screenshot%202026-09-20%20142521.png)

- **What is shown:** Split view featuring a full ES6+ React code editor on the left and a live interactive mobile phone emulator on the right.

#### 3.5c: Code Sync & State Validation
![Frontend Code and State](images/Screenshot%202026-09-20%20142614.png)

- **What is shown:** The candidate editing search filter logic and mapping product arrays in code while seeing immediate UI updates in the live preview.

#### 3.5d: Laptop & Desktop Responsive Testing
![Frontend Laptop View](images/Screenshot%202026-09-20%20142624.png)

- **What is shown:** Switching device viewports to Laptop mode to test how the component layout adapts to desktop screen widths.
- **Simple Explanation:** Frontend developers need to build web interfaces that work smoothly on phones, tablets, and laptops. This studio lets candidates write real React code and test it live across different screen sizes.

---

## Phase 4: Supervision, Leaderboard & Safety Audit

To maintain high standards, faculty monitor live sessions in real time, student rankings update dynamically on public leaderboards, and administrators audit anonymous safety records and audio recordings.

---

### Step 4.1: Faculty Live Interview Monitoring Console

![Faculty Live Monitoring](images/Screenshot%202026-09-20%20143018.png)

- **What is shown:** The faculty dashboard displaying all active live interview rooms currently taking place in their venue. Shows room numbers, subject track, participant names, duration, and a green **Listen & Inspect** button.
- **Simple Explanation:** Faculty members can drop in on any ongoing interview like a supervisor stepping into an exam room. They can listen to live audio to ensure students remain focused and professional.

---

### Step 4.2: Student Leaderboard & Performance Ranking

![Leaderboard](images/Screenshot%202026-09-20%20140309.png)

- **What is shown:** The campus-wide student leaderboard ranking candidates by cumulative total points earned across interviews, interviews attended, and cohort average scores. Includes buttons to view individual student scorecards.
- **Simple Explanation:** Gamifying practice motivates students to participate frequently. Top performers are highlighted at the top of the leaderboard based on peer ratings and assessment accuracy.

---

### Step 4.3: Comprehensive Interview History Records

![Interview History](images/Screenshot%202026-09-20%20141035.png)

- **What is shown:** The complete audit log of every interview session conducted on the platform. Displays Room #, Domain Track, Student A & B identities, session status (Completed/In Progress), duration, and safety alerts (e.g., *Identity Solicited*).
- **Simple Explanation:** Every single interview leaves a permanent audit trail. If any unusual activity occurs during a session, it is immediately highlighted in red for admin review.

---

### Step 4.4: Safety Violation Audit & Anonymity Reporting

![Safety Incident Audit](images/Screenshot%202026-09-20%20141144.png)

- **What is shown:** An incident investigation page triggered when a student reports an anonymity violation. For example: *"Jaison David M reported that JagaPrsanth S attempted to deanonymize the session by asking for personal roll numbers or phone numbers."*
- **Simple Explanation:** MockMate strictly enforces anonymity so students aren't biased by who their partner is. If a peer asks for personal contact info, phone numbers, or social media handles, the affected student can click report, triggering an official safety audit flag for administrators.

---

### Step 4.5: Admin Audio Dialogue Player & Incident Verification

![Audio Dialogue Player](images/Screenshot%202026-09-20%20141159.png)

- **What is shown:** An embedded audio player in the admin portal allowing administrators to stream, control playback speed (0.75x, 1x, 1.25x, 1.5x, 2x), and download recorded dialogue files (`session_6.webm`).
- **Simple Explanation:** Before taking disciplinary action or resolving a safety flag, administrators can listen to the actual recorded conversation of the interview session to verify what was said.

---

## 🎯 Summary of Key Benefits for Reviewers

1. **Structured Learning Journey:** From administrator curriculum setup to student practice and peer feedback, every stage is seamlessly integrated.
2. **Real-World Interactive Tools:** Students don't just answer multiple-choice questions—they design backend architectures, write live database queries, and code responsive web interfaces.
3. **Physical-Digital Synergy:** Requiring physical attendance in campus venues prevents proxy attendance while allowing digital peer-to-peer collaboration.
4. **Safety & Integrity:** Automated double-blind pairing, safety violation flags, and admin audio audit players ensure a respectful, unbiased environment for all students.
