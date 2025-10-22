import React, { useState, useEffect, useRef } from 'react';
import SmartBinDashboard from './components/ArchitectureDiagram';
import { 
    BellIcon, LayoutIcon, MapIcon, PlusIcon, SettingsIcon, 
    Trash2Icon, UserIcon, UsersIcon, BarChart2Icon, HelpCircleIcon, 
    SlidersIcon, Share2Icon, ArrowLeftIcon, ChevronRightIcon,
    PackageIcon, SaveIcon, EditIcon, TrashIcon, AlertTriangleIcon, XIcon, UploadCloudIcon, BatteryIcon, FileTextIcon, DropletIcon, SunIcon
} from './components/Icons';

declare const mqtt: any; 

// --- Types ---
type View = 'dashboard' | 'deviceManagement' | 'users' | 'settings' | 'maps' | 'analytics' | 'help' | 'ruleEngine' | 'mqtt' | 'deviceLog';

interface ViewConfig {
    title: string;
    path: string[];
}

interface Device {
  id: string;
  model: string;
  firmwareVersion: string;
  locationName: string;
  building: string;
  floor: string;
  zone: string;
  connectionType: 'wifi' | 'ethernet' | 'cellular';
  networkName: string;
  warningLevel: number;
  criticalLevel: number;
  batteryLevel: number;
  status: 'Operational' | 'Warning' | 'Critical';
  wasteType: 'Wet' | 'Dry';
  fillLevel: number;
  lastEmptied: string;
  coords?: [number, number];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Administrator' | 'Facility Manager' | 'Standard User';
  lastLogin: string;
  status: 'Active' | 'Inactive';
}

interface FloorBin {
    id: string;
    x: number;
    y: number;
}

interface Floor {
    name: string;
    imageUrl: string;
    bins: FloorBin[];
}

interface MqttConfig {
    host: string;
    port: number;
    useTLS: boolean;
    username: string;
    telemetryTopic: string;
    commandTopic: string;
}

interface Notification {
  id: string;
  type: 'critical' | 'low_battery';
  deviceId: string;
  message: string;
}


const VIEW_CONFIGS: Record<View, ViewConfig> = {
    dashboard: { title: 'Dashboard', path: ['Home', 'Smart Bin', 'Dashboard'] },
    deviceManagement: { title: 'Device Management', path: ['Home', 'Smart Bin', 'Device Management'] },
    deviceLog: { title: 'Device Log', path: ['Home', 'Monitoring', 'Device Log'] },
    users: { title: 'User Management', path: ['Home', 'Admin', 'Users'] },
    settings: { title: 'Settings', path: ['Home', 'Admin', 'Settings'] },
    maps: { title: 'Floor Maps', path: ['Home', 'Assets', 'Floor Maps'] },
    analytics: { title: 'Analytics', path: ['Home', 'Reports', 'Analytics'] },
    help: { title: 'Help', path: ['Home', 'Support', 'Help'] },
    ruleEngine: { title: 'Rule Engine', path: ['Home', 'Automation', 'Rule Engine'] },
    mqtt: { title: 'MQTT Broker', path: ['Home', 'Configuration', 'MQTT Broker'] }
};

const initialDevices: Device[] = [
    { id: 'SB-101', model: 'EcoBin-100', firmwareVersion: 'v1.2.3', locationName: 'Cafeteria', building: 'Building A', floor: '1', zone: 'A', connectionType: 'wifi', networkName: 'Office_WiFi', warningLevel: 70, criticalLevel: 85, batteryLevel: 95, status: 'Operational', wasteType: 'Wet', fillLevel: 42, lastEmptied: '4 hours ago', coords: [51.51, -0.1] },
    { id: 'SB-102', model: 'SmartBin-200', firmwareVersion: 'v2.0.1', locationName: 'Main Entrance', building: 'Building A', floor: 'G', zone: 'Lobby', connectionType: 'cellular', networkName: 'IoT_Network', warningLevel: 75, criticalLevel: 90, batteryLevel: 45, status: 'Warning', wasteType: 'Dry', fillLevel: 78, lastEmptied: '1 day ago', coords: [51.505, -0.09] },
    { id: 'SB-103', model: 'IoT-Waste-300', firmwareVersion: 'v3.1.0', locationName: 'Floor 2, West Wing', building: 'Building B', floor: '2', zone: 'C', connectionType: 'ethernet', networkName: 'CorpNet', warningLevel: 80, criticalLevel: 95, batteryLevel: 15, status: 'Critical', wasteType: 'Dry', fillLevel: 95, lastEmptied: '2 days ago', coords: [51.515, -0.12] },
    { id: 'SB-104', model: 'EcoBin-100', firmwareVersion: 'v1.2.5', locationName: 'Parking P1', building: 'Building A', floor: 'P1', zone: 'A', connectionType: 'wifi', networkName: 'Office_WiFi', warningLevel: 70, criticalLevel: 85, batteryLevel: 88, status: 'Operational', wasteType: 'Dry', fillLevel: 35, lastEmptied: '8 hours ago', coords: [51.52, -0.11] },
];

// --- Components ---

const Navbar = () => (
  <nav className="bg-amber-400 text-black shadow-md">
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Trash2Icon className="w-7 h-7 text-gray-800" />
          <span className="text-xl font-bold text-gray-900">Fernhill IOT</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-amber-500/50 transition">
            <BellIcon className="w-5 h-5" />
          </button>
          <div className="relative group">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer text-white">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sign out</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
);

const Sidebar: React.FC<{ currentView: View, navigate: (view: View) => void }> = ({ currentView, navigate }) => {
    const NavButton: React.FC<{ view: View, icon: React.ReactNode, label: string }> = ({ view, icon, label }) => {
        const isActive = currentView === view;
        const baseClasses = "w-full flex items-center space-x-3 p-3 rounded-lg transition text-gray-700 text-sm";
        const activeClasses = "bg-amber-100 text-amber-900 font-semibold";
        const inactiveClasses = "hover:bg-gray-100";
        return (
            <button onClick={() => navigate(view)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
                {icon}
                <span>{label}</span>
            </button>
        );
    };

    return (
        <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 px-2">Smart Bin Project</h2>
                <div className="space-y-1">
                    <NavButton view="dashboard" icon={<LayoutIcon className="w-4 h-4" />} label="Dashboard" />
                    <NavButton view="deviceManagement" icon={<PackageIcon className="w-4 h-4" />} label="Device Management" />
                    <NavButton view="deviceLog" icon={<FileTextIcon className="w-4 h-4" />} label="Device Log" />
                    <NavButton view="users" icon={<UsersIcon className="w-4 h-4" />} label="User Management" />
                    <NavButton view="ruleEngine" icon={<SlidersIcon className="w-4 h-4" />} label="Rule Engine" />
                    <NavButton view="mqtt" icon={<Share2Icon className="w-4 h-4" />} label="MQTT Broker" />
                    <NavButton view="settings" icon={<SettingsIcon className="w-4 h-4" />} label="Settings" />
                    <NavButton view="maps" icon={<MapIcon className="w-4 h-4" />} label="Floor Maps" />
                    <NavButton view="analytics" icon={<BarChart2Icon className="w-4 h-4" />} label="Analytics" />
                    <NavButton view="help" icon={<HelpCircleIcon className="w-4 h-4" />} label="Help" />
                </div>
            </div>
        </div>
    );
};

const Breadcrumbs: React.FC<{ config: ViewConfig, onBack: () => void, canGoBack: boolean }> = ({ config, onBack, canGoBack }) => (
    <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
        <div className="flex items-center text-sm text-gray-500">
            {canGoBack && (
                <button onClick={onBack} className="mr-3 text-gray-600 hover:text-black">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
            )}
            {config.path.map((item, index) => (
                <React.Fragment key={item}>
                    <span>{item}</span>
                    {index < config.path.length - 1 && <ChevronRightIcon className="w-4 h-4 mx-1" />}
                </React.Fragment>
            ))}
        </div>
    </div>
);

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="mt-4 text-gray-600">This section is under development. Content for the {title.toLowerCase()} will be available soon.</p>
    </div>
);

// --- NOTIFICATION COMPONENTS ---
const NotificationToast: React.FC<{ notification: Notification; onDismiss: (id: string) => void; }> = ({ notification, onDismiss }) => {
    const isCritical = notification.type === 'critical';
    const icon = isCritical ? <AlertTriangleIcon className="w-6 h-6 text-red-500" /> : <BatteryIcon className="w-6 h-6 text-orange-500" />;
    const borderColor = isCritical ? 'border-red-200' : 'border-orange-200';

    return (
        <div className={`w-full max-w-sm bg-white rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${borderColor} mb-4 animate-fade-in-right`}>
            <style>{`
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
            `}</style>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">{icon}</div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">{isCritical ? `Critical Alert` : `Low Battery`}: {notification.deviceId}</p>
                        <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button onClick={() => onDismiss(notification.id)} className="inline-flex text-gray-400 rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
                            <span className="sr-only">Close</span>
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationContainer: React.FC<{ notifications: Notification[]; onDismiss: (id: string) => void; }> = ({ notifications, onDismiss }) => {
    return (
        <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
            <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                {notifications.map(n => (
                    <NotificationToast key={n.id} notification={n} onDismiss={onDismiss} />
                ))}
            </div>
        </div>
    );
};

// --- ADD/EDIT DEVICE COMPONENT ---
const AddDevicePage: React.FC<{ onCancel: () => void; onSave: (device: Device) => void; deviceToEdit?: Device | null; }> = ({ onCancel, onSave, deviceToEdit }) => {
    const isEditing = !!deviceToEdit;
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        const newDevice: Device = {
            id: deviceToEdit?.id || `SB-${Math.floor(Math.random() * 1000)}`, // Generate ID if new
            model: formData.get('device-model') as string,
            firmwareVersion: formData.get('firmware-version') as string,
            locationName: formData.get('location-name') as string,
            building: formData.get('building') as string,
            floor: formData.get('floor') as string,
            zone: formData.get('zone') as string,
            connectionType: formData.get('connection-type') as 'wifi' | 'ethernet' | 'cellular',
            networkName: formData.get('network-name') as string,
            wasteType: formData.get('waste-type') as 'Wet' | 'Dry',
            warningLevel: parseInt(formData.get('warning-level') as string, 10),
            criticalLevel: parseInt(formData.get('critical-level') as string, 10),
            batteryLevel: deviceToEdit?.batteryLevel || 100, // Preserve battery or default
            status: deviceToEdit?.status || 'Operational', // Preserve status or default
            fillLevel: deviceToEdit?.fillLevel || 0,
            lastEmptied: deviceToEdit?.lastEmptied || 'Never',
        };
        onSave(newDevice);
    };
    
    const inputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
    
    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{isEditing ? `Edit SmartBin: ${deviceToEdit.id}`: 'Add New SmartBin'}</h1>
                <button onClick={onCancel} className="text-sm text-amber-600 hover:text-amber-800 flex items-center">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to Device List
                </button>
            </div>

            <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Device Information</h3>
                        <div>
                            <label htmlFor="device-id" className={labelClasses}>Device ID</label>
                            <input type="text" id="device-id" name="device-id" className={`${inputClasses} bg-gray-100`} placeholder="SB-XXX" defaultValue={deviceToEdit?.id} disabled={isEditing} />
                        </div>
                        <div>
                            <label htmlFor="device-model" className={labelClasses}>Model</label>
                            <select id="device-model" name="device-model" className={inputClasses} defaultValue={deviceToEdit?.model}>
                                <option value="">Select model</option>
                                <option value="EcoBin-100">EcoBin-100</option>
                                <option value="SmartBin-200">SmartBin-200</option>
                                <option value="IoT-Waste-300">IoT-Waste-300</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="firmware-version" className={labelClasses}>Firmware Version</label>
                            <input type="text" id="firmware-version" name="firmware-version" className={inputClasses} placeholder="v1.2.3" defaultValue={deviceToEdit?.firmwareVersion} />
                        </div>
                         <div>
                            <label htmlFor="waste-type" className={labelClasses}>Waste Type</label>
                            <select id="waste-type" name="waste-type" className={inputClasses} defaultValue={deviceToEdit?.wasteType || 'Dry'}>
                                <option value="Dry">Dry Waste</option>
                                <option value="Wet">Wet Waste</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Location Information</h3>
                        <div>
                            <label htmlFor="location-name" className={labelClasses}>Location Name</label>
                            <input type="text" id="location-name" name="location-name" className={inputClasses} placeholder="e.g., Cafeteria" defaultValue={deviceToEdit?.locationName} />
                        </div>
                        <div>
                            <label htmlFor="building" className={labelClasses}>Building/Area</label>
                            <input type="text" id="building" name="building" className={inputClasses} placeholder="e.g., Office Building A" defaultValue={deviceToEdit?.building} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label htmlFor="floor" className={labelClasses}>Floor</label><input type="text" id="floor" name="floor" className={inputClasses} placeholder="e.g., G" defaultValue={deviceToEdit?.floor} /></div>
                            <div><label htmlFor="zone" className={labelClasses}>Zone</label><input type="text" id="zone" name="zone" className={inputClasses} placeholder="e.g., 1" defaultValue={deviceToEdit?.zone} /></div>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Network Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="connection-type" className={labelClasses}>Connection Type</label>
                            <select id="connection-type" name="connection-type" className={inputClasses} defaultValue={deviceToEdit?.connectionType}>
                                <option value="wifi">WiFi</option><option value="ethernet">Ethernet</option><option value="cellular">Cellular</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="network-name" className={labelClasses}>Network Name</label>
                            <input type="text" id="network-name" name="network-name" className={inputClasses} placeholder="e.g., Office_WiFi" defaultValue={deviceToEdit?.networkName} />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Threshold Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label htmlFor="warning-level" className={labelClasses}>Warning Level (%)</label><input type="number" id="warning-level" name="warning-level" min="0" max="100" className={inputClasses} defaultValue={deviceToEdit?.warningLevel || 70} /></div>
                        <div><label htmlFor="critical-level" className={labelClasses}>Critical Level (%)</label><input type="number" id="critical-level" name="critical-level" min="0" max="100" className={inputClasses} defaultValue={deviceToEdit?.criticalLevel || 85} /></div>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center">
                        <SaveIcon className="w-4 h-4 mr-2" />
                        Save Device
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- DELETE CONFIRMATION MODAL ---
const DeleteConfirmationModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void; }> = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4 text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">{message}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700">Confirm Delete</button>
            </div>
        </div>
    </div>
);


// --- DEVICE MANAGEMENT PAGE ---
const getBatteryStyle = (level: number) => {
    if (level < 20) return { color: 'text-red-600' };
    if (level < 50) return { color: 'text-orange-600' };
    return { color: 'text-green-600' };
};

const DeviceManagementPage: React.FC<{ devices: Device[]; setDevices: React.Dispatch<React.SetStateAction<Device[]>> }> = ({ devices, setDevices }) => {
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null);
    const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

    const handleAddNew = () => {
        setDeviceToEdit(null);
        setIsFormVisible(true);
    };

    const handleEdit = (device: Device) => {
        setDeviceToEdit(device);
        setIsFormVisible(true);
    };

    const handleDeleteRequest = (device: Device) => {
        setDeviceToDelete(device);
    };
    
    const handleDeleteConfirm = () => {
        if (deviceToDelete) {
            setDevices(prev => prev.filter(d => d.id !== deviceToDelete.id));
            setDeviceToDelete(null);
        }
    };
    
    const handleSaveDevice = (deviceData: Device) => {
        if (deviceToEdit) { // Update existing
            setDevices(prev => prev.map(d => d.id === deviceData.id ? deviceData : d));
        } else { // Add new
            setDevices(prev => [...prev, deviceData]);
        }
        setIsFormVisible(false);
        setDeviceToEdit(null);
    };

    if (isFormVisible) {
        return <AddDevicePage onCancel={() => setIsFormVisible(false)} onSave={handleSaveDevice} deviceToEdit={deviceToEdit} />;
    }

    const statusStyles = {
        Critical: 'bg-red-100 text-red-800',
        Warning: 'bg-orange-100 text-orange-800',
        Operational: 'bg-green-100 text-green-800'
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {deviceToDelete && <DeleteConfirmationModal title="Delete Device" message={`Are you sure you want to delete device ${deviceToDelete.id}? This action cannot be undone.`} onConfirm={handleDeleteConfirm} onCancel={() => setDeviceToDelete(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Device Management</h1>
                <button onClick={handleAddNew} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add New Bin
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waste Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {devices.map(device => {
                            const batteryStyle = getBatteryStyle(device.batteryLevel);
                            return (
                                <tr key={device.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{device.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.locationName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center">
                                            {device.wasteType === 'Wet' ? 
                                                <DropletIcon className="w-4 h-4 mr-2 text-blue-500" /> : 
                                                <SunIcon className="w-4 h-4 mr-2 text-yellow-500" />
                                            }
                                            <span>{device.wasteType}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[device.status]}`}>
                                            {device.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className={`flex items-center ${batteryStyle.color}`}>
                                            <BatteryIcon className="w-4 h-4 mr-2" />
                                            <span>{device.batteryLevel}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => handleEdit(device)} className="text-amber-600 hover:text-amber-900 mr-4"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteRequest(device)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {devices.length === 0 && (
                 <div className="mt-4 border-t pt-4">
                    <p className="text-center text-gray-500">No devices registered yet. Click "Add New Bin" to get started.</p>
                </div>
            )}
        </div>
    );
};

// --- USER MANAGEMENT ---

const AddEditUserPage: React.FC<{ onCancel: () => void; onSave: (user: User) => void; userToEdit?: User | null; }> = ({ onCancel, onSave, userToEdit }) => {
    const isEditing = !!userToEdit;
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        const newUser: User = {
            id: userToEdit?.id || `user-${Math.floor(Math.random() * 1000)}`,
            firstName: formData.get('first-name') as string,
            lastName: formData.get('last-name') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as 'Administrator' | 'Facility Manager' | 'Standard User',
            status: formData.get('status') as 'Active' | 'Inactive',
            lastLogin: userToEdit?.lastLogin || 'Never',
        };
        onSave(newUser);
    };

    const inputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{isEditing ? `Edit User: ${userToEdit.firstName} ${userToEdit.lastName}` : 'Add New User'}</h1>
                <button onClick={onCancel} className="text-sm text-amber-600 hover:text-amber-800 flex items-center">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to User List
                </button>
            </div>

            <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label htmlFor="first-name" className={labelClasses}>First Name</label><input type="text" id="first-name" name="first-name" className={inputClasses} defaultValue={userToEdit?.firstName} required /></div>
                    <div><label htmlFor="last-name" className={labelClasses}>Last Name</label><input type="text" id="last-name" name="last-name" className={inputClasses} defaultValue={userToEdit?.lastName} required /></div>
                </div>
                <div>
                    <label htmlFor="email" className={labelClasses}>Email Address</label>
                    <input type="email" id="email" name="email" className={inputClasses} defaultValue={userToEdit?.email} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="role" className={labelClasses}>Role</label>
                        <select id="role" name="role" className={inputClasses} defaultValue={userToEdit?.role} required>
                            <option>Standard User</option>
                            <option>Facility Manager</option>
                            <option>Administrator</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="status" className={labelClasses}>Status</label>
                        <select id="status" name="status" className={inputClasses} defaultValue={userToEdit?.status} required>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>
                 <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center">
                        <SaveIcon className="w-4 h-4 mr-2" />
                        Save User
                    </button>
                </div>
            </form>
        </div>
    );
};


const initialUsers: User[] = [
    { id: 'user-1', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', role: 'Administrator', lastLogin: '2 hours ago', status: 'Active' },
    { id: 'user-2', firstName: 'Manager', lastName: 'User', email: 'manager@example.com', role: 'Facility Manager', lastLogin: '1 day ago', status: 'Active' },
    { id: 'user-3', firstName: 'Standard', lastName: 'User', email: 'user@example.com', role: 'Standard User', lastLogin: '3 days ago', status: 'Inactive' },
];

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    
    const handleAddNew = () => {
        setUserToEdit(null);
        setIsFormVisible(true);
    };

    const handleEdit = (user: User) => {
        setUserToEdit(user);
        setIsFormVisible(true);
    };
    
    const handleDeleteRequest = (user: User) => {
        setUserToDelete(user);
    };

    const handleDeleteConfirm = () => {
        if (userToDelete) {
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setUserToDelete(null);
        }
    };

    const handleSaveUser = (userData: User) => {
        if (userToEdit) {
            setUsers(prev => prev.map(u => u.id === userData.id ? userData : u));
        } else {
            setUsers(prev => [...prev, userData]);
        }
        setIsFormVisible(false);
        setUserToEdit(null);
    };

    if (isFormVisible) {
        return <AddEditUserPage onCancel={() => setIsFormVisible(false)} onSave={handleSaveUser} userToEdit={userToEdit} />;
    }
    
    const roleStyles: Record<User['role'], string> = {
        Administrator: 'bg-purple-100 text-purple-800',
        'Facility Manager': 'bg-blue-100 text-blue-800',
        'Standard User': 'bg-gray-200 text-gray-800'
    };
    
     const statusStyles: Record<User['status'], string> = {
        Active: 'bg-green-100 text-green-800',
        Inactive: 'bg-gray-100 text-gray-600'
    };


    return (
        <div className="bg-white rounded-lg shadow p-6">
             {userToDelete && <DeleteConfirmationModal title="Delete User" message={`Are you sure you want to delete user ${userToDelete.firstName} ${userToDelete.lastName}? This action cannot be undone.`} onConfirm={handleDeleteConfirm} onCancel={() => setUserToDelete(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                <button onClick={handleAddNew} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add New User
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <UserIcon className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleStyles[user.role]}`}>{user.role}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[user.status]}`}>{user.status}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.lastLogin}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button onClick={() => handleEdit(user)} className="text-amber-600 hover:text-amber-900 mr-4"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteRequest(user)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {users.length === 0 && (
                 <div className="mt-4 border-t pt-4">
                    <p className="text-center text-gray-500">No users found. Click "Add New User" to get started.</p>
                </div>
            )}
        </div>
    );
};


// --- FLOOR MAPS PAGE ---
const initialFloorsData: Floor[] = [
    { name: 'Ground Floor', imageUrl: 'https://placehold.co/1200x800/e2e8f0/64748b?text=Ground+Floor+Layout', bins: [{ id: 'SB-102', x: 25, y: 50 }] },
    { name: '1st Floor', imageUrl: 'https://placehold.co/1200x800/dbeafe/4b5563?text=1st+Floor+Layout', bins: [{ id: 'SB-101', x: 60, y: 40 }] },
    { name: '2nd Floor', imageUrl: 'https://placehold.co/1200x800/d1fae5/374151?text=2nd+Floor+Layout', bins: [{ id: 'SB-103', x: 75, y: 70 }] }
];


const AddBinModal: React.FC<{ devices: Device[], onAdd: (deviceId: string) => void, onCancel: () => void }> = ({ devices, onAdd, onCancel }) => {
    const [selectedDevice, setSelectedDevice] = useState<string>(devices[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(selectedDevice) {
            onAdd(selectedDevice);
        }
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add Bin to Map</h3>
                    <p className="text-sm text-gray-500 mb-2">Select an available device to place on the map.</p>
                    <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                        {devices.length > 0 ? (
                           devices.map(d => <option key={d.id} value={d.id}>{d.id} ({d.locationName})</option>)
                        ) : (
                           <option disabled>No available devices</option>
                        )}
                    </select>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={!selectedDevice} className="px-4 py-2 text-sm font-medium text-white bg-amber-500 border border-transparent rounded-md shadow-sm hover:bg-amber-600 disabled:bg-gray-300">Add Bin</button>
                </div>
            </form>
        </div>
    );
};


const BinMarker: React.FC<{
    binLocation: FloorBin;
    device?: Device;
    isEditMode: boolean;
    isActivePopup: boolean;
    onDelete: (id: string) => void;
    onPositionChange: (id: string, newPos: { x: number, y: number }) => void;
    onMarkerClick: (id: string) => void;
    mapRef: React.RefObject<HTMLDivElement>;
}> = ({ binLocation, device, isEditMode, isActivePopup, onDelete, onPositionChange, onMarkerClick, mapRef }) => {
    const [isDragging, setIsDragging] = useState(false);
    const markerRef = useRef<HTMLDivElement>(null);

    const status = device?.status || 'Operational';
    const statusStyles = {
        Critical: { outer: 'bg-red-500', inner: 'bg-red-300' },
        Warning: { outer: 'bg-orange-500', inner: 'bg-orange-300' },
        Operational: { outer: 'bg-green-500', inner: 'bg-green-300' }
    };
    const style = statusStyles[status];

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        setIsDragging(true);
        e.preventDefault();
    };
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !markerRef.current || !mapRef.current) return;
            const mapRect = mapRef.current.getBoundingClientRect();
            let newX = ((e.clientX - mapRect.left) / mapRect.width) * 100;
            let newY = ((e.clientY - mapRect.top) / mapRect.height) * 100;
            newX = Math.max(0, Math.min(100, newX));
            newY = Math.max(0, Math.min(100, newY));
            markerRef.current.style.left = `${newX}%`;
            markerRef.current.style.top = `${newY}%`;
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isDragging || !markerRef.current || !mapRef.current) return;
            setIsDragging(false);
            const mapRect = mapRef.current.getBoundingClientRect();
            let finalX = ((e.clientX - mapRect.left) / mapRect.width) * 100;
            let finalY = ((e.clientY - mapRect.top) / mapRect.height) * 100;
            finalX = Math.max(0, Math.min(100, finalX));
            finalY = Math.max(0, Math.min(100, finalY));
            onPositionChange(binLocation.id, { x: finalX, y: finalY });
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, binLocation.id, onPositionChange, mapRef]);

    return (
        <div
            ref={markerRef}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-transform duration-150 ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${isDragging ? 'scale-125 shadow-lg z-10' : ''}`}
            style={{ left: `${binLocation.x}%`, top: `${binLocation.y}%` }}
            aria-label={`Bin ${binLocation.id}, Status: ${status}`}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                if (!isEditMode) {
                    e.stopPropagation();
                    onMarkerClick(binLocation.id);
                }
            }}
        >
            {isEditMode && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(binLocation.id); }}
                    className="absolute -top-2 -right-2 z-20 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    aria-label={`Delete ${binLocation.id}`}
                >
                    <XIcon className="w-3 h-3"/>
                </button>
            )}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${style.outer} ${isDragging ? '' : 'animate-pulse'}`}>
                <div className={`w-3 h-3 rounded-full ${style.inner}`}></div>
            </div>
            <div className={`absolute bottom-full mb-2 w-max left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 transition-opacity pointer-events-none z-20 ${isActivePopup ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <strong>ID:</strong> {binLocation.id}<br/>
                <strong>Status:</strong> {status}<br/>
                <strong>Fill Level:</strong> {device?.fillLevel || 0}%
            </div>
        </div>
    );
};

const FloorMapsPage: React.FC<{ devices: Device[] }> = ({ devices }) => {
    const [floors, setFloors] = useState<Floor[]>(initialFloorsData);
    const [originalFloors, setOriginalFloors] = useState<Floor[]>(initialFloorsData);
    const [activeFloorIndex, setActiveFloorIndex] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const [addBinState, setAddBinState] = useState<{showModal: boolean, coords: {x: number, y: number} | null}>({showModal: false, coords: null});
    const [activeBinPopup, setActiveBinPopup] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeFloor = floors[activeFloorIndex];

    const getDeviceById = (id: string) => devices.find(d => d.id === id);

    const toggleEditMode = () => {
        if (!isEditMode) {
             setOriginalFloors(JSON.parse(JSON.stringify(floors))); // Deep copy for cancellation
        }
        setIsEditMode(!isEditMode);
        setActiveBinPopup(null); // Close popups when changing mode
    };
    
    const handleSaveChanges = () => {
        setIsEditMode(false);
        // In a real app, you would send `floors` data to a server here.
    };
    
    const handleCancelChanges = () => {
        setFloors(originalFloors);
        setIsEditMode(false);
    };
    
    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        setActiveBinPopup(null);
        if (!isEditMode || !mapContainerRef.current) return;
        const rect = mapContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setAddBinState({ showModal: true, coords: { x, y } });
    };

    const handleAddBin = (deviceId: string) => {
        if (!addBinState.coords) return;
        const newFloors = [...floors];
        newFloors[activeFloorIndex].bins.push({ id: deviceId, x: addBinState.coords.x, y: addBinState.coords.y });
        setFloors(newFloors);
        setAddBinState({ showModal: false, coords: null });
    };

    const handleDeleteBin = (binId: string) => {
        const newFloors = [...floors];
        newFloors[activeFloorIndex].bins = newFloors[activeFloorIndex].bins.filter(b => b.id !== binId);
        setFloors(newFloors);
    };
    
    const handlePositionChange = (binId: string, newPos: {x: number, y: number}) => {
         const newFloors = floors.map((floor, index) => {
            if (index === activeFloorIndex) {
                return {
                    ...floor,
                    bins: floor.bins.map(bin => bin.id === binId ? { ...bin, ...newPos } : bin)
                };
            }
            return floor;
        });
        setFloors(newFloors);
    };

    const handleMarkerClick = (binId: string) => {
        setActiveBinPopup(prev => (prev === binId ? null : binId));
    };

    const handleAddNewFloor = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const floorName = (form.elements.namedItem('floorName') as HTMLInputElement).value;
        const fileInput = form.elements.namedItem('floorImage') as HTMLInputElement;

        if (floorName && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    const imageUrl = reader.result as string;
                    setFloors(prevFloors => {
                        const newFloors = [...prevFloors, { name: floorName, imageUrl, bins: [] }];
                        // Automatically switch to the newly created floor
                        setActiveFloorIndex(newFloors.length - 1);
                        return newFloors;
                    });
                    form.reset();
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const placedBinIds = new Set(floors.flatMap(f => f.bins.map(b => b.id)));
    const unplacedDevices = devices.filter(d => !placedBinIds.has(d.id));

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {addBinState.showModal && <AddBinModal devices={unplacedDevices} onAdd={handleAddBin} onCancel={() => setAddBinState({showModal: false, coords: null})}/>}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Floor Maps</h1>
                <div>
                {isEditMode ? (
                    <div className="flex space-x-2">
                         <button onClick={handleCancelChanges} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition">Cancel</button>
                         <button onClick={handleSaveChanges} className="px-4 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition">Save Changes</button>
                    </div>
                ) : (
                    <button onClick={toggleEditMode} className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">Manage Floor Plan</button>
                )}
                </div>
            </div>

            {isEditMode && (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 mb-6">
                     <h3 className="text-lg font-semibold text-gray-800 mb-2">Add New Floor</h3>
                     <form onSubmit={handleAddNewFloor} className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex-grow w-full">
                            <label htmlFor="floorName" className="block text-sm font-medium text-gray-700 mb-1">Floor Name</label>
                            <input type="text" id="floorName" name="floorName" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" placeholder="e.g., Basement"/>
                        </div>
                        <div className="flex-grow w-full">
                            <label htmlFor="floorImage" className="block text-sm font-medium text-gray-700 mb-1">Floor Map Image</label>
                            <input type="file" id="floorImage" name="floorImage" required accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"/>
                        </div>
                        <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center">
                            <UploadCloudIcon className="w-4 h-4 mr-2" />Add Floor
                        </button>
                     </form>
                </div>
            )}
            
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {floors.map((floor, index) => (
                        <button
                            key={floor.name}
                            onClick={() => setActiveFloorIndex(index)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeFloorIndex === index
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {floor.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div 
                ref={mapContainerRef} 
                className={`relative w-full aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden ${isEditMode ? 'cursor-crosshair' : ''}`}
                onClick={handleMapClick}
            >
                {activeFloor && <img src={activeFloor.imageUrl} alt={activeFloor.name} className="w-full h-full object-cover" />}
                {activeFloor && activeFloor.bins.map(bin => {
                    const device = getDeviceById(bin.id);
                    return (
                        <BinMarker 
                            key={bin.id} 
                            binLocation={bin} 
                            device={getDeviceById(bin.id)}
                            isEditMode={isEditMode}
                            isActivePopup={activeBinPopup === bin.id}
                            onDelete={handleDeleteBin}
                            onPositionChange={handlePositionChange}
                            onMarkerClick={handleMarkerClick}
                            mapRef={mapContainerRef}
                        />
                    );
                })}
            </div>

            <div className="mt-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Legend</h3>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded-full bg-green-500"></div><span className="text-sm text-gray-600">Operational</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded-full bg-orange-500"></div><span className="text-sm text-gray-600">Warning</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded-full bg-red-500"></div><span className="text-sm text-gray-600">Critical</span></div>
                </div>
            </div>
        </div>
    );
};

// --- MQTT BROKER PAGE ---
const initialMqttConfig: MqttConfig = {
    host: 'broker.hivemq.com',
    port: 8884,
    useTLS: true,
    username: '',
    telemetryTopic: 'fernhill/bins/+/telemetry',
    commandTopic: 'fernhill/bins/+/commands',
};

const MqttBrokerPage: React.FC = () => {
    const [config, setConfig] = useState<MqttConfig>(initialMqttConfig);
    const [originalConfig, setOriginalConfig] = useState<MqttConfig>(initialMqttConfig);
    const [isEditing, setIsEditing] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected'>('Connected');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setConfig(prev => ({
            ...prev,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            setOriginalConfig(config); // Save current state before editing
        }
        setIsEditing(!isEditing);
    };

    const handleCancel = () => {
        setConfig(originalConfig); // Revert to original state
        setIsEditing(false);
    };

    const handleSave = () => {
        // Here you would typically send the new config to your backend
        console.log('Saving new MQTT config:', config);
        setIsEditing(false);
    };

    const handleTestConnection = () => {
        alert('Simulating connection test...\nConnection successful!');
    };
    
    const inputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
    
    const InfoRow: React.FC<{ label: string; value: string | number | React.ReactNode; }> = ({ label, value }) => (
        <div>
            <p className={labelClasses}>{label}</p>
            <div className="text-sm p-2 bg-gray-50 rounded-md text-gray-800">{value}</div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800">MQTT Broker Settings</h1>
                <div>
                {isEditing ? (
                    <div className="flex space-x-2">
                         <button onClick={handleCancel} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition">Cancel</button>
                         <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition flex items-center"><SaveIcon className="w-4 h-4 mr-2"/>Save Changes</button>
                    </div>
                ) : (
                    <button onClick={handleEditToggle} className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center"><EditIcon className="w-4 h-4 mr-2"/>Edit Configuration</button>
                )}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <div>
                        <p className="font-semibold text-gray-800">{connectionStatus}</p>
                        <p className="text-sm text-gray-500">{config.host}:{config.port}</p>
                    </div>
                </div>
                <button onClick={handleTestConnection} className="px-4 py-2 text-sm text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200 transition">Test Connection</button>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="host" className={labelClasses}>Broker Host</label>
                        <input type="text" name="host" value={config.host} onChange={handleInputChange} className={inputClasses} disabled={!isEditing} />
                    </div>
                     <div>
                        <label htmlFor="port" className={labelClasses}>Port</label>
                        <input type="number" name="port" value={config.port} onChange={handleInputChange} className={inputClasses} disabled={!isEditing} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="username" className={labelClasses}>Username</label>
                        <input type="text" name="username" value={config.username} onChange={handleInputChange} className={inputClasses} disabled={!isEditing} />
                    </div>
                    <div className="flex items-center mt-6">
                        <input type="checkbox" id="useTLS" name="useTLS" checked={config.useTLS} onChange={handleInputChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500" disabled={!isEditing}/>
                        <label htmlFor="useTLS" className="ml-2 block text-sm text-gray-900">Use TLS Encryption</label>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Topic Structure</h3>
                     <div className="space-y-4">
                        <InfoRow label="Telemetry Topic (Device to Cloud)" value={<code className="text-sm bg-gray-200 p-1 rounded">{config.telemetryTopic}</code>} />
                        <InfoRow label="Commands Topic (Cloud to Device)" value={<code className="text-sm bg-gray-200 p-1 rounded">{config.commandTopic}</code>} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- DEVICE LOG PAGE ---
interface LogEntry {
    timestamp: string;
    topic: string;
    payload: string;
    source: string;
}

const DeviceLogPage: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLogging, setIsLogging] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'Disconnected' | 'Connecting...' | 'Connected' | 'Error'>('Disconnected');
    const clientRef = useRef<any | null>(null);
    const logContainerRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    };

    useEffect(scrollToBottom, [logs]);

    const startLogging = () => {
        if (clientRef.current || isLogging) return;
        
        setIsLogging(true);
        setConnectionStatus('Connecting...');

        const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
        clientRef.current = client;

        client.on('connect', () => {
            setConnectionStatus('Connected');
            // Subscribe to the telemetry topic for all smart bins
            client.subscribe('fernhill/bins/+/telemetry', (err: Error) => {
                if (err) {
                    console.error('Subscription error:', err);
                    setConnectionStatus('Error');
                    client.end();
                }
            });
        });

        client.on('message', (topic: string, message: Uint8Array) => {
            const payload = new TextDecoder("utf-8").decode(message);
            const newLog: LogEntry = {
                timestamp: new Date().toISOString(),
                topic,
                payload,
                source: 'MQTT Broker',
            };
            setLogs(prevLogs => [...prevLogs.slice(-200), newLog]); // Keep last 200 logs
        });
        
        client.on('error', (err: Error) => {
            console.error('MQTT Connection Error:', err);
            setConnectionStatus('Error');
            client.end();
            clientRef.current = null;
            setIsLogging(false);
        });

        client.on('close', () => {
            if (isLogging) { 
                setConnectionStatus('Disconnected');
            }
            clientRef.current = null;
            setIsLogging(false);
        });
    };
    
    const stopLogging = () => {
        if (clientRef.current) {
            clientRef.current.end();
        }
        setIsLogging(false);
        setConnectionStatus('Disconnected');
    };

    const clearLogs = () => {
        setLogs([]);
    };
    
    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (clientRef.current) {
                clientRef.current.end();
            }
        };
    }, []);
    
    const statusStyles = {
        'Disconnected': 'bg-gray-200 text-gray-700',
        'Connecting...': 'bg-yellow-200 text-yellow-800 animate-pulse',
        'Connected': 'bg-green-200 text-green-800',
        'Error': 'bg-red-200 text-red-800'
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 h-[calc(100vh-12rem)] flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Device Telemetry Log</h1>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-4">
                    {!isLogging ? (
                        <button onClick={startLogging} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Start Logging</button>
                    ) : (
                        <button onClick={stopLogging} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Stop Logging</button>
                    )}
                    <button onClick={clearLogs} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">Clear Log</button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[connectionStatus]}`}>
                        {connectionStatus}
                    </span>
                </div>
            </div>

            <div ref={logContainerRef} className="flex-grow bg-gray-900 text-white font-mono text-sm p-4 rounded-lg overflow-y-auto">
                {logs.length === 0 ? (
                    <p className="text-gray-400">Waiting for data... Start logging to see device telemetry.</p>
                ) : (
                    logs.map((log, index) => (
                        <div key={index} className="flex flex-wrap items-start mb-2">
                            <span className="text-cyan-400 mr-4 whitespace-nowrap">{log.timestamp}</span>
                            <span className="text-green-400 mr-4 whitespace-nowrap">[{log.source}]</span>
                            <span className="text-amber-400 mr-4 whitespace-nowrap">[{log.topic}]</span>
                            <span className="text-gray-200 flex-1 whitespace-pre-wrap break-all">{log.payload}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    const [view, setView] = useState<View>('dashboard');
    const [history, setHistory] = useState<View[]>(['dashboard']);
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const updateNotifications = (updatedDevice: Device) => {
        setNotifications(prevNotifications => {
            let currentNotifications = [...prevNotifications];
            const { id: deviceId, status, batteryLevel } = updatedDevice;

            // Check for CRITICAL FILL LEVEL
            const criticalFillId = `${deviceId}-critical-fill`;
            const isCritical = status === 'Critical';
            const hasCriticalFillNotif = currentNotifications.some(n => n.id === criticalFillId);

            if (isCritical && !hasCriticalFillNotif) {
                currentNotifications.push({
                    id: criticalFillId, type: 'critical', deviceId,
                    message: `Bin ${deviceId} has reached a critical fill level and needs to be emptied.`
                });
            } else if (!isCritical && hasCriticalFillNotif) {
                currentNotifications = currentNotifications.filter(n => n.id !== criticalFillId);
            }
            
            // Check for LOW BATTERY
            const lowBatteryId = `${deviceId}-low-battery`;
            const LOW_BATTERY_THRESHOLD = 20;
            const isLowBattery = batteryLevel <= LOW_BATTERY_THRESHOLD;
            const hasLowBatteryNotif = currentNotifications.some(n => n.id === lowBatteryId);

            if (isLowBattery && !hasLowBatteryNotif) {
                 currentNotifications.push({
                    id: lowBatteryId, type: 'low_battery', deviceId,
                    message: `Bin ${deviceId}'s battery is very low at ${batteryLevel}%. Please take action.`
                });
            } else if (!isLowBattery && hasLowBatteryNotif) {
                currentNotifications = currentNotifications.filter(n => n.id !== lowBatteryId);
            }
            
            return currentNotifications;
        });
    };

    useEffect(() => {
        const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

        client.on('connect', () => {
            console.log('MQTT Connected');
            client.subscribe('fernhill/bins/+/telemetry', (err: Error) => {
                if (err) {
                    console.error('Subscription error:', err);
                    client.end();
                }
            });
        });

        client.on('message', (topic: string, message: Uint8Array) => {
            try {
                const payloadStr = new TextDecoder("utf-8").decode(message);
                const telemetry = JSON.parse(payloadStr);
                const topicParts = topic.split('/');
                
                if (topicParts.length === 4 && topicParts[0] === 'fernhill' && topicParts[1] === 'bins' && topicParts[3] === 'telemetry') {
                    const deviceId = topicParts[2];

                    setDevices(prevDevices => {
                        let targetDevice: Device | undefined;
                        const newDevices = prevDevices.map(d => {
                            if (d.id !== deviceId) return d;

                            const newFillLevel = telemetry.fillLevel ?? d.fillLevel;
                            const newBatteryLevel = telemetry.batteryLevel ?? d.batteryLevel;
                            
                            let newStatus: 'Operational' | 'Warning' | 'Critical' = 'Operational';
                            if (newFillLevel >= d.criticalLevel) newStatus = 'Critical';
                            else if (newFillLevel >= d.warningLevel) newStatus = 'Warning';

                            targetDevice = { ...d, fillLevel: newFillLevel, batteryLevel: newBatteryLevel, status: newStatus };
                            return targetDevice;
                        });

                        if (targetDevice) {
                            updateNotifications(targetDevice);
                        }
                        
                        return newDevices;
                    });
                }
            } catch (e) {
                console.error('Error processing MQTT message:', e);
            }
        });
        
        client.on('error', (err: Error) => { console.error('MQTT Connection Error:', err); client.end(); });
        client.on('close', () => { console.log('MQTT Disconnected'); });
        return () => { if (client) client.end(); };
    }, []);

    const navigate = (newView: View) => {
        if (newView !== view) {
            setView(newView);
            setHistory(prev => [...prev, newView]);
        }
    };
    
    const goBack = () => {
        const newHistory = [...history];
        newHistory.pop();
        const previousView = newHistory[newHistory.length - 1];
        if (previousView) {
            setView(previousView);
            setHistory(newHistory);
        }
    };
    
    const handleDismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <SmartBinDashboard devices={devices} setDevices={setDevices} />;
            case 'deviceManagement':
                return <DeviceManagementPage devices={devices} setDevices={setDevices} />;
            case 'deviceLog':
                return <DeviceLogPage />;
            case 'users':
                return <UserManagementPage />;
            case 'maps':
                return <FloorMapsPage devices={devices} />;
            case 'mqtt':
                return <MqttBrokerPage />;
            case 'analytics':
            case 'help':
            case 'ruleEngine':
            case 'settings':
                return <PlaceholderPage title={VIEW_CONFIGS[view].title} />;
            default:
                return <div>Unknown view</div>;
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <NotificationContainer notifications={notifications} onDismiss={handleDismissNotification} />
            <main className="flex-grow container mx-auto p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    <Sidebar currentView={view} navigate={navigate} />
                    <div className="flex-1">
                        <Breadcrumbs config={VIEW_CONFIGS[view]} onBack={goBack} canGoBack={history.length > 1} />
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;