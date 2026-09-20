# 🎓 MockMate - Project Flow & Interview Modes Guide

## 1. Core MVP Concept & How Peer Interviews Work

### What is MockMate? (MVP Overview)
**MockMate** is an anonymous peer-to-peer technical mock interview platform for campus students. The MVP (Minimum Viable Product) enables students to practice technical interviews in real-time with fellow peers while maintaining double-blind anonymity, structured evaluation rubrics, and real-time interactive workspaces.

---

### How a Peer Interview Session Works (Rounds & Role Swapping)

Every MockMate peer interview session consists of **2 distinct rounds** with an automatic **Role Swap**:

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                           LIVE SESSION (2 ROUNDS)                        │
 ├─────────────────────────────────────────────────────────────────────────┤
 │  ROUND 1 (First 50% Time)                                               │
 │  • Student A  ➡️  INTERVIEWER (Assessor / Observes & Scores)            │
 │  • Student B  ➡️  CANDIDATE    (Interviewee / Solves & Explains)        │
 ├─────────────────────────────────────────────────────────────────────────┤
 │  🔄 AUTOMATIC ROLE SWAP                                                 │
 ├─────────────────────────────────────────────────────────────────────────┤
 │  ROUND 2 (Second 50% Time)                                              │
 │  • Student B  ➡️  INTERVIEWER (Assessor / Observes & Scores)            │
 │  • Student A  ➡️  CANDIDATE    (Interviewee / Solves & Explains)        │
 └─────────────────────────────────────────────────────────────────────────┘
```

1. **Anonymous WebRTC Voice Link:** Both participants connect via a live background audio channel without seeing each other's name, roll number, or face.
2. **Round 1:** Student A receives the interviewer's solution guide, answer keys, and scoring tools. Student B receives the problem statement and workspace.
3. **Role Swap:** Halfway through the session, the platform automatically flips the roles so Student B becomes the Interviewer and Student A becomes the Candidate.
4. **Mutual Peer Evaluation:** At the end of both rounds, both participants fill out a structured rubric grading each other on technical clarity, communication, and problem-solving skills.

---

## 2. Student Journey: Dashboard & Slot Booking

### Student Performance Dashboard

![Student Dashboard](images/Screenshot%202026-09-20%20141426.png)

- **Explanation:** The candidate's home portal. It displays total points accumulated across mock interviews, average score per session, total sessions completed, overall grade (e.g., *71% Proficient (B)*), and a skill competency bar chart.
- **Action:** Students click **Join Mock Interview** to enter their scheduled live interview room.

---

### Slot Booking & Attendance Status

![Student Booking Status](images/Screenshot%202026-09-20%20142933.png)

- **Explanation:** Shows the candidate's reserved interview slot (e.g., *Data Structures & Algorithms, Sept 21, 09:00 - 10:00 AM*).
- **Physical Gatekeeping:** Displays an **Attendance Pending** tag. Students must physically arrive at the assigned campus venue (e.g., Vedhanayagam Auditorium) and have the faculty invigilator check them in before the digital room unlocks.

---

## 3. Interactive Interview Modes (Mode Breakdown)

MockMate provides **4 distinct interview modes**, each tailored to a specific domain with dedicated live workspace tools:

---

### Mode 1: Multiple-Choice Questions (MCQ) Assessment Mode

![MCQ Live Observer View](images/Screenshot%202026-09-20%20142904.png)

- **Description:** Designed for speed assessments on Computer Science fundamentals, algorithm complexity, and theory.
- **Interviewer Observer View:** The interviewer (Student A) observes the candidate's (Student B) answer selection live in real-time.
- **Scoring & Solution Key:** The interviewer sees:
  - Live candidate pick (e.g., *Option C: O(N log N)*).
  - Target benchmark correct answer (e.g., *Option B: O(log N)*).
  - Detailed solution rationale explaining why the answer is correct.
- **Voice Communication:** Students discuss the question over live WebRTC audio while reviewing the answer.

---

### Mode 2: System Design & Architecture Mode (Whiteboard Studio)

#### A. Session Room Landing Page
![System Design Room](images/Screenshot%202026-09-20%20142005.png)

- **Description:** Prepares candidates for high-level system architecture interviews. Displays the design challenge (e.g., *"Design a Distributed URL Shortener"*), system throughput limits, and WebRTC audio controls.

#### B. Interactive Architecture Whiteboard Studio
![System Design Whiteboard Studio](images/Screenshot%202026-09-20%20142116.png)

- **Interactive Canvas:** A full-screen collaborative whiteboard studio where candidates drag and drop architecture nodes:
  - **Component Palette:** Web Clients, API Gateways, Microservices, Relational DBs, Cache Stores, Message Queues, Object Storage.
  - **Protocol Connectors:** Connects nodes using explicit protocol lines (e.g., *HTTPS/REST*, *Direct TCP*, *Async Queue*).
- **Live Sync:** The interviewer watches the candidate build the system diagram in real time while discussing architecture trade-offs.

---

### Mode 3: Database Engineering & SQL Mode (Query Sandbox & ER Modeler)

#### A. Session Landing Room
![Database Interview Room](images/Screenshot%202026-09-20%20142222.png)

- **Description:** Focused on database normalization, complex SQL joins, and schema modeling (e.g., *"E-Commerce Customer Order Analytics"*).

#### B. Live MySQL Sandbox & Query Editor
![SQL Query Sandbox](images/Screenshot%202026-09-20%20142247.png)

- **Live Code Execution:** Candidates write `CREATE TABLE` and `SELECT` queries on the left editor and execute them directly against an isolated **MySQL 8.0 sandbox**.
- **Data Results View:** Displays actual query outputs, table row contents, and schema structure on the right panel.

#### C. Automatic Visual ER Diagram Generator
![Interactive ER Diagram](images/Screenshot%202026-09-20%20142300.png)

- **Visual Schema Graph:** Automatically parses the written SQL tables (`users`, `orders`, `order_items`) and renders an interactive Entity-Relationship (ER) diagram showing primary keys (PK), foreign keys (FK), and table cardinality relationships (`1:N`).

---

### Mode 4: Frontend Web Development Mode (React & Responsive Emulator)

#### A. Frontend Workspace Overview
![Frontend Workspace](images/Screenshot%202026-09-20%20142356.png)

- **Description:** Evaluates candidates on component architecture, React state management, and Tailwind CSS (e.g., *"Product Search and Category Filter"*).

#### B. React Studio & Live Mobile Device Emulator
![Frontend Mobile View](images/Screenshot%202026-09-20%20142521.png)

- **Code Editor & Mobile Preview:** Features a full ES6+ React editor on the left synced with a live mobile phone device emulator on the right.

#### C. Real-Time Logic & State Sync
![Frontend State Sync](images/Screenshot%202026-09-20%20142614.png)

- **Instant Hot-Reload:** As the candidate writes state filtering logic (`useState`, `filter()`, `map()`), the mobile emulator instantly updates without page refreshes.

#### D. Multi-Device Responsive Testing (Laptop View)
![Frontend Laptop View](images/Screenshot%202026-09-20%20142624.png)

- **Responsive Viewport Control:** Candidates switch device modes (Mobile, Mobile Lg, Tablet, Laptop) to verify how their UI grid layout adapts across desktop screen sizes.

---

## 4. Safety, Monitoring & Student Leaderboard

### Faculty Live Interview Monitoring

![Faculty Live Monitoring](images/Screenshot%202026-09-20%20143018.png)

- **Real-Time Supervision:** Faculty members monitor all active peer interview sessions running in their venue.
- **Audio Inspection:** Faculty can click **Listen & Inspect** to silently join the room's WebRTC audio stream and listen to the dialogue to ensure professionalism.

---

### Student Leaderboard & Scorecards

![Student Leaderboard](images/Screenshot%202026-09-20%20140309.png)

- **Rankings:** Displays student standings ranked by total points gained across all mock interviews, completed interview count, and cohort average scores.
- **Scorecards:** Admins and faculty can view individual student scorecards to track progress over time.

---

### Interview History & Anonymity Incident Auditing

#### Master Pairing History
![Interview History](images/Screenshot%202026-09-20%20141035.png)

- Complete log of all past sessions detailing Room #, Domain, Student A & B identities, session duration, and safety alerts.

#### Safety & Anonymity Reporting Console
![Safety Incident Audit](images/Screenshot%202026-09-20%20141144.png)

- **Identity Solicitation Flag:** If a candidate attempts to break anonymity (e.g., asking for roll numbers, names, phone numbers, or social media handles), the affected peer reports the session.
- **Admin Warning:** Flagged sessions appear in red on the admin dashboard with an **Admin Review Required** status.

---

### Admin Audio Dialogue Playback & Verification

![Audio Dialogue Player](images/Screenshot%202026-09-20%20141159.png)

- **Voice Dialogue Audit:** Administrators can open the audio player to stream the recorded audio file (`session_6.webm`) of any flagged interview.
- **Playback Controls:** Includes speed adjustments (0.75x to 2x) and download options to verify safety violations before taking administrative action.

---

## 5. Administrator Operations & System Configuration (Admin Controls)

> *This section details the administrative backend where campus setup, problem banks, rubrics, exam scheduling, and physical venue attendance are managed.*

---

### System Analytics Dashboard

![Admin Analytics Dashboard](images/Screenshot%202026-09-20%20140125.png)

- **Overview:** High-level metrics showing total registered students, mock session completion rates, total practice hours, average scores, and rubric score breakdowns across technical, communication, reasoning, and answering skills.

---

### Configuring Interview Domains & Progression Levels

#### Domains & Tracks Setup
![Interview Domains](images/Screenshot%202026-09-20%20140145.png)

- Admins create and activate learning tracks (DSA, System Design, SQL, Frontend, Backend, CS Fundamentals).

#### Progression Levels Configuration
![Progression Tiers](images/Screenshot%202026-09-20%20140154.png)

- Admins structure each track into sequential tiers (Level 1, Level 2, Level 3), set session time limits (e.g., 45 mins), and define questions per session.

---

### Question Bank Management

![Question Bank](images/Screenshot%202026-09-20%20140208.png)

- Admins add, edit, or bulk-upload questions for each level, defining difficulty levels (Easy/Medium/Hard) and input/output test cases.

---

### Peer Feedback Questionnaire & Mark Weightage

![Peer Feedback Config](images/Screenshot%202026-09-20%20140246.png)

- Admins build the post-interview evaluation form that students use to grade each other, assigning point weightages (+2, +4, +6, +8, +10 pts) per option with a live dialog preview.

---

### Scheduling Exam Slots & Physical Campus Venues

![Venues and Slot Scheduling](images/Screenshot%202026-09-20%20140332.png)

- Admins schedule official interview slots (e.g., Sept 21, 09:00 AM - 10:00 AM) and assign them to physical campus locations like the Auditorium or Digital Library.

---

### Managing Room Rosters & Capacity

![Slot Roster Control](images/Screenshot%202026-09-20%20140344.png)

- Admins manage seat capacities per room (50 seats in Auditorium, 50 seats in Library), assign faculty invigilators to rooms, monitor booked seats, and publish allocations.

---

### Faculty Venue Attendance Verification

![Faculty Attendance Desk](images/Screenshot%202026-09-20%20143000.png)

- Faculty invigilators stationed at physical venue doors search for candidates by Roll Number/Name and mark them **Present**, **Late**, or **Absent**.
- Marking a candidate **Present** unlocks their digital interview room gate so they can join their anonymous peer session.
