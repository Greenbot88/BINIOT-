import React, { useState, useEffect, useRef } from 'react';
import { Trash2Icon, CheckCircleIcon, AlertCircleIcon, AlertTriangleIcon, SearchIcon, EditIcon, TrashIcon, XIcon, BatteryIcon } from './Icons';

// TypeScript declarations for CDN libraries
declare const L: any;
declare const Chart: any;

// --- TYPE DEFINITIONS ---
// This type must be kept in sync with the one in App.tsx
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
  fillLevel: number;
  lastEmptied: string;
  coords?: [number, number];
}

// --- MOCK DATA & CONFIG ---
const STATUS_CONFIG_BASE = {
  Total: { icon: <Trash2Icon className="w-5 h-5"/>, color: 'gray' },
  Operational: { icon: <CheckCircleIcon className="w-5 h-5"/>, color: 'green' },
  'Needs Attention': { icon: <AlertCircleIcon className="w-5 h-5"/>, color: 'orange' },
  Critical: { icon: <AlertTriangleIcon className="w-5 h-5"/>, color: 'red' },
};

const getBatteryStyle = (level: number) => {
    if (level < 20) return { color: 'text-red-600' };
    if (level < 50) return { color: 'text-orange-600' };
    return { color: 'text-green-600' };
};

// --- SUB-COMPONENTS ---

const StatusCard: React.FC<{ title: string; count: number }> = ({ title, count }) => {
    const config = STATUS_CONFIG_BASE[title as keyof typeof STATUS_CONFIG_BASE];
    if (!config) return null;

    const colors = {
        gray: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-800', iconBg: 'bg-gray-200', iconText: 'text-gray-600' },
        green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800', iconBg: 'bg-green-100', iconText: 'text-green-600' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-800', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800', iconBg: 'bg-red-100', iconText: 'text-red-600' },
    };
    const C = colors[config.color as keyof typeof colors];

    return (
        <div className={`${C.bg} p-4 rounded-lg border ${C.border}`}>
            <div className="flex justify-between">
                <div>
                    <p className={`text-sm font-medium ${C.text}`}>{title}</p>
                    <h3 className="text-2xl font-bold text-gray-800">{count}</h3>
                </div>
                <div className={`p-3 rounded-full ${C.iconBg} ${C.iconText}`}>
                    {config.icon}
                </div>
            </div>
        </div>
    );
};

const BinTableRow: React.FC<{ device: Device; onRowClick: (device: Device) => void; onDeleteRequest: (device: Device) => void; }> = ({ device, onRowClick, onDeleteRequest }) => {
    const statusStyles: Record<Device['status'], string> = {
        Critical: 'bg-red-100 text-red-800',
        Warning: 'bg-orange-100 text-orange-800',
        Operational: 'bg-green-100 text-green-800',
    };
    const progressStyles: Record<Device['status'], string> = {
        Critical: 'bg-red-500',
        Warning: 'bg-orange-500',
        Operational: 'bg-green-500',
    };
    const batteryStyle = getBatteryStyle(device.batteryLevel);

    return (
        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(device)}>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Trash2Icon className="text-gray-600" />
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{device.id}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{device.locationName}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[device.status]}`}>
                    {device.status}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${progressStyles[device.status]}`} style={{ width: `${device.fillLevel}%` }}></div>
                        </div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{device.fillLevel}%</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className={`flex items-center ${batteryStyle.color}`}>
                    <BatteryIcon className="w-4 h-4 mr-2" />
                    <span>{device.batteryLevel}%</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.lastEmptied}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-amber-600 hover:text-amber-900 mr-4" onClick={(e) => { e.stopPropagation(); alert(`Editing ${device.id}`); }}>
                    <EditIcon className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-900" onClick={(e) => { e.stopPropagation(); onDeleteRequest(device); }}>
                    <TrashIcon className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
};

const Charts: React.FC<{devices: Device[]}> = ({ devices }) => {
    const weeklyChartRef = useRef<HTMLCanvasElement>(null);
    const statusChartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let weeklyChart: any, statusChart: any;
        if (weeklyChartRef.current) {
             weeklyChart = new Chart(weeklyChartRef.current, {
                type: 'line', data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Average Fill Level %', data: [45, 52, 60, 70, 65, 78, 82], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', tension: 0.3, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
            });
        }
        if (statusChartRef.current) {
            const opCount = devices.filter(b => b.status === 'Operational').length;
            const warnCount = devices.filter(b => b.status === 'Warning').length;
            const critCount = devices.filter(b => b.status === 'Critical').length;
            statusChart = new Chart(statusChartRef.current, {
                type: 'doughnut', data: { labels: ['Operational', 'Warning', 'Critical'], datasets: [{ data: [opCount, warnCount, critCount], backgroundColor: ['#22c55e', '#f97316', '#ef4444'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
            });
        }
        return () => {
            weeklyChart?.destroy();
            statusChart?.destroy();
        };
    }, [devices]);

    return (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Weekly Fill Levels</h2>
                <div className="h-64"><canvas ref={weeklyChartRef}></canvas></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Bin Status Distribution</h2>
                <div className="h-64"><canvas ref={statusChartRef}></canvas></div>
            </div>
        </div>
    );
};

const Map: React.FC<{ devices: Device[], onMarkerClick: (device: Device) => void }> = ({ devices, onMarkerClick }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markers = useRef<any[]>([]);

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);
        }

        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        const binIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484613.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        devices.forEach(device => {
            if (device.coords) {
                const marker = L.marker(device.coords, { icon: binIcon }).addTo(mapInstance.current)
                    .bindPopup(`<b>${device.id}</b><br>Status: ${device.status}`);
                marker.on('click', () => onMarkerClick(device));
                markers.current.push(marker);
            }
        });

    }, [devices, onMarkerClick]);
    
    return (
         <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Bin Locations</h2>
            <div id="map" ref={mapRef} className="h-[400px] rounded-lg"></div>
        </div>
    );
}

const BinDetailsModal: React.FC<{ device: Device | null; onClose: () => void; onMarkAsEmptied: (deviceId: string) => void; }> = ({ device, onClose, onMarkAsEmptied }) => {
    if (!device) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Bin Details: {device.id}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-700">Basic Information</h4>
                            <div className="space-y-2">
                                <div><label className="text-sm text-gray-500">Location</label><p className="font-medium text-gray-800">{device.locationName}</p></div>
                                <div><label className="text-sm text-gray-500">Installation Date</label><p className="font-medium text-gray-800">2023-05-15</p></div>
                                <div><label className="text-sm text-gray-500">Last Emptied</label><p className="font-medium text-gray-800">{device.lastEmptied}</p></div>
                            </div>
                        </div>
                        <div>
                           <h4 className="font-semibold mb-2 text-gray-700">Current Status</h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-sm text-gray-500">Fill Level</label>
                                    <p className="font-medium text-gray-800">{device.fillLevel}%</p>
                                </div>
                                 <div>
                                    <label className="text-sm text-gray-500">Battery</label>
                                    <p className="font-medium text-gray-800">{device.batteryLevel}%</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Status</label>
                                    <p className="font-medium text-gray-800">{device.status}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h4 className="font-semibold mb-2 text-gray-700">Actions</h4>
                        <div className="flex space-x-3">
                            <button onClick={() => { if(device) onMarkAsEmptied(device.id) }} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition">Mark as Emptied</button>
                            <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">Request Service</button>
                            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">View History</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

// --- MAIN DASHBOARD COMPONENT ---
const SmartBinDashboard: React.FC<{ devices: Device[]; setDevices: React.Dispatch<React.SetStateAction<Device[]>>; }> = ({ devices, setDevices }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [binToDelete, setBinToDelete] = useState<Device | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [libraryError, setLibraryError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof L === 'undefined' || typeof Chart === 'undefined') {
            const missing = [];
            if (typeof L === 'undefined') missing.push('Map');
            if (typeof Chart === 'undefined') missing.push('Chart');
            setLibraryError(`Failed to load external ${missing.join(' and ')} libraries. Please check your internet connection and refresh the page.`);
        }
    }, []);

    if (libraryError) {
        return (
            <div className="bg-white rounded-lg shadow p-6 text-center">
                <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Dashboard Error</h2>
                <p className="mt-2 text-gray-600">{libraryError}</p>
            </div>
        );
    }

    const handleRowClick = (device: Device) => {
        setSelectedDevice(device);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDevice(null);
    };

    const handleDeleteRequest = (device: Device) => {
        setBinToDelete(device);
    };

    const handleDeleteConfirm = () => {
        if (binToDelete) {
            setDevices(prev => prev.filter(b => b.id !== binToDelete.id));
            setBinToDelete(null);
        }
    };
    
    const handleMarkAsEmptied = (deviceId: string) => {
        setDevices(prevDevices => 
            prevDevices.map(d => 
                d.id === deviceId 
                ? { ...d, fillLevel: 5, status: 'Operational', lastEmptied: 'Just now' } 
                : d
            )
        );
        closeModal();
    };

    const filteredDevices = devices.filter(device =>
        device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.locationName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusCounts = {
        Total: filteredDevices.length,
        Operational: filteredDevices.filter(b => b.status === 'Operational').length,
        'Needs Attention': filteredDevices.filter(b => b.status === 'Warning').length,
        Critical: filteredDevices.filter(b => b.status === 'Critical').length,
    };
    
    return (
        <div className="flex flex-col gap-6">
            <BinDetailsModal device={selectedDevice} onClose={closeModal} onMarkAsEmptied={handleMarkAsEmptied} />
            {binToDelete && <DeleteConfirmationModal title="Delete Bin" message={`Are you sure you want to delete bin ${binToDelete.id}? This action cannot be undone.`} onConfirm={handleDeleteConfirm} onCancel={() => setBinToDelete(null)} />}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Smart Bin Project Dashboard</h1>
                    <div className="relative w-full sm:w-auto">
                        <input type="text" placeholder="Search bins..." className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm}/>
                        <SearchIcon className="absolute left-3 top-2.5 text-gray-400 w-5 h-5"/>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatusCard title="Total" count={statusCounts.Total}/>
                    <StatusCard title="Operational" count={statusCounts.Operational}/>
                    <StatusCard title="Needs Attention" count={statusCounts['Needs Attention']}/>
                    <StatusCard title="Critical" count={statusCounts.Critical}/>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fill Level</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Emptied</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDevices.map(device => <BinTableRow key={device.id} device={device} onRowClick={handleRowClick} onDeleteRequest={handleDeleteRequest}/>)}
                        </tbody>
</table>
                     {filteredDevices.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No bins found.
                        </div>
                    )}
                </div>
            </div>
            
            <Charts devices={devices}/>
            <Map devices={devices} onMarkerClick={handleRowClick} />
        </div>
    );
};

export default SmartBinDashboard;