# Fernhill IOT - Smart Bin Dashboard Blueprint

## 1. Introduction

This document outlines the architectural blueprint and design principles for the Fernhill IOT Smart Bin Dashboard. The application is a Single-Page Application (SPA) designed to provide real-time monitoring, management, and analytics for a fleet of smart waste bins.

Key features include:
- **Real-time Monitoring:** Live updates of bin status, fill levels, and battery life.
- **Connectivity Status:** Automatic detection of online/offline status for each device.
- **Device Management:** A CRUD interface for registering, configuring, and removing smart bins.
- **User Administration:** Management of users and their roles within the system.
- **Visualizations:** Interactive charts, floor maps, and a geographical map for at-a-glance insights.
- **Real-time Data Feed:** Direct integration with an MQTT broker for live telemetry data.

---

## 2. Core Technologies

- **Frontend Framework:** **React 19** for building the component-based user interface.
- **Language:** **TypeScript** for static typing, improved code quality, and developer experience.
- **Styling:** **Tailwind CSS** for a utility-first approach to styling, enabling rapid and consistent UI development.
- **Real-time Communication:** **MQTT.js** library to establish a WebSocket connection with an MQTT broker for receiving live telemetry.
- **Charting Library:** **Chart.js** for rendering interactive data visualizations, such as fill-level trends and status distributions.
- **Mapping Library:** **Leaflet.js** for displaying the geographical locations of the smart bins on an interactive map.

---

## 3. Architecture Overview

The application follows a component-based SPA architecture.

### 3.1. Application Structure

- **`index.html`**: The main entry point that loads required CDN scripts (React, Tailwind, Leaflet, Chart.js, MQTT.js) and mounts the React application to the root div.
- **`index.tsx`**: The script that renders the main `App` component into the DOM.
- **`App.tsx`**: The root component of the application. It acts as the central controller and state manager.
- **`components/`**: A directory containing reusable and view-specific components.
  - **`ArchitectureDiagram.tsx`**: The main dashboard view component (named for historical reasons, represents the primary UI).
  - **`Icons.tsx`**: A library of SVG icons used throughout the application.

### 3.2. State Management

The application employs a centralized state management strategy within the top-level `App.tsx` component.

- The primary state, including the list of `devices`, `users`, `notifications`, and the `currentView`, is managed using React's `useState` hook.
- State and state-updating functions (e.g., `devices`, `setDevices`) are passed down to child components via props (prop-drilling). This approach is simple and effective for the current scale of the application.
- For future scalability, a dedicated state management library like **Zustand** or **Redux Toolkit** could be considered to avoid deep prop-drilling.

### 3.3. View Routing

A simple, state-based navigation system is implemented.
- The `view` state variable in `App.tsx` determines which page/component is rendered.
- The `Sidebar` component contains buttons that call the `navigate` function, which updates the `view` state.
- A `history` array tracks the navigation path, enabling a simple "back" functionality. For more complex needs, **React Router** would be the next logical step.

---

## 4. Component Breakdown

- **`App.tsx`**:
  - **Responsibilities**: Manages global state, initializes the MQTT client, handles view navigation, implements the offline status check, and renders the main layout (`Navbar`, `Sidebar`, active page).
- **`SmartBinDashboard` (`components/ArchitectureDiagram.tsx`)**:
  - **Responsibilities**: Displays the main dashboard UI, including status summary cards, a detailed device table, charts, and the Leaflet map. Handles filtering and user interactions within the dashboard view.
- **Page Components (within `App.tsx`)**:
  - **`DeviceManagementPage`**: Provides a full CRUD interface for managing devices. It renders the `AddDevicePage` for create/edit operations.
  - **`UserManagementPage`**: Provides a CRUD interface for managing users.
  - **`FloorMapsPage`**: An interactive tool for placing bin markers on uploaded floor plan images. Manages its own state for floors and bin positions.
  - **`MqttBrokerPage`**: A configuration screen for MQTT settings.
  - **`DeviceLogPage`**: A real-time log viewer that establishes its own MQTT connection to display raw incoming telemetry data.
- **Modal Components (within `App.tsx` and `SmartBinDashboard.tsx`)**:
  - **`BinDetailsModal`**: Shows detailed information about a selected bin.
  - **`DeleteConfirmationModal`**: A reusable modal to confirm destructive actions.
  - **`AddBinModal`**: Allows users to select a device to place on a floor map.

---

## 5. Data Flow

### 5.1. Real-time Telemetry (MQTT)

1.  A smart bin publishes a JSON payload (e.g., `{ "fillLevel": 85, "batteryLevel": 90, "coords": [51.51, -0.12] }`) to its unique MQTT topic (`fernhill/bins/SB-101/telemetry`).
2.  The `App.tsx` component, subscribed to the wildcard topic `fernhill/bins/+/telemetry`, receives the message.
3.  The `on('message')` handler parses the message and topic to identify the device ID and its new data.
4.  The `setDevices` state updater is called. It finds the corresponding device in the state array and updates its properties. Critically, it updates the `lastSeen` property to the current timestamp.
5.  Based on the new `fillLevel` and the device's `warningLevel`/`criticalLevel` thresholds, the device's `status` is re-calculated (`Operational`, `Warning`, or `Critical`). This action effectively marks the device as "Online".
6.  React triggers a re-render, and all components consuming the `devices` prop (like the map and tables) update to reflect the new data instantly.
7.  A notification may be generated if a threshold is crossed.

### 5.2. Offline Status Detection

1.  In `App.tsx`, a `setInterval` runs periodically (e.g., every 30 seconds).
2.  On each tick, it iterates through all devices in the state.
3.  For each device, it compares the current time with the timestamp in the device's `lastSeen` property.
4.  If the difference exceeds a predefined timeout (e.g., 5 minutes), the `setDevices` function is called to update that specific device's `status` to `'Offline'`.
5.  This triggers a UI re-render, causing the device to appear as offline across the dashboard, maps, and tables.

### 5.3. User-Initiated Actions (e.g., Emptying a Bin)

1.  User clicks "Mark as Emptied" in the `BinDetailsModal`.
2.  The `onMarkAsEmptied` callback is invoked, passing the `deviceId`.
3.  This callback, originating from `SmartBinDashboard.tsx`, calls the `setDevices` function passed down from `App.tsx`.
4.  The `setDevices` function updates the specific bin's state: `fillLevel` is reset to a low value (e.g., 5%), `status` becomes 'Operational', and `lastEmptied` is updated.
5.  The UI re-renders across the application to show the updated status.

---

## 6. Future Considerations & Scalability

- **API Layer**: For persistence, a backend API (e.g., REST, GraphQL) is necessary to store device configurations, user data, historical data, and floor plans in a database.
- **Authentication**: A robust authentication mechanism (e.g., JWT, OAuth) should be implemented to secure the dashboard.
- **Component Lazy Loading**: As the application grows, lazy loading components for different views can improve initial load times.
- **WebSockets vs. MQTT over WS**: While MQTT over WebSockets is effective, for some UI interactions, a direct WebSocket connection to the backend might be beneficial for actions not related to device telemetry.