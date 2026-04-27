# CozyCorner 🏨

A modern, glassmorphic property booking platform built as a Multi-Page Application (MPA). This frontend-only prototype utilizes `localStorage` for state management, authentication, and role-based access control.

## ✨ Features

* **Role-Based Access Control (RBAC):** Distinct routing and UI experiences for Guests, Users, Admins, and Super Admins.
* **Local Storage Database:** Fully functional frontend prototyping for bookings and user profiles without a backend.
* **Modern UI/UX:** Features a sleek glassmorphism design with a vibrant, high-contrast, multi-color theme.
* **Pure Vanilla Stack:** Built entirely without external frameworks or libraries.

## 🔐 Test Credentials

To explore the different role-based views and features, use the following demo accounts on the `/auth.html` page. 

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **User** | `user` | `user` | Can view 'My Bookings' (Upcoming, Past, Canceled) & Profile. |
| **Admin** | `admin` | `admin` | Can access Admin Dashboard, manage reservations, rooms, and support. |
| **Super Admin**| `superadmin` | `superadmin` | Full system access, including Super Admin Dashboard and Admin management. |

> **Note:** Because this project uses `localStorage`, authentication state is saved in your browser. To switch accounts, simply use the "Logout" button in the navigation menu before logging in with a new role.

## 🛠️ Tech Stack

* **HTML5:** Semantic, multi-page structure.
* **CSS3:** Custom variables, flexbox/grid layouts, and glassmorphism styling.
* **JavaScript (ES6+):** DOM manipulation, routing logic, and `localStorage` API integration.

## 🚀 How to Run Locally

1. Clone this repository or download the source code.
2. No Node.js, `npm`, or database setup is required.
3. Simply open the `index.html` file in any modern web browser.
4. Navigate to the Login page and use the credentials provided above to test the application.

## 👥 Developers
* **Adrian M. Reniva**
* **Christian Angelo Pila**
