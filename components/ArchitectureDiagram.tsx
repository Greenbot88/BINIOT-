import React, { useState, useEffect, useRef } from 'react';
import { Trash2Icon, CheckCircleIcon, AlertCircleIcon, AlertTriangleIcon, SearchIcon, EditIcon, TrashIcon, XIcon } from './Icons';

// TypeScript declarations for CDN libraries
declare const L: any;
declare const Chart: any;

// --- TYPE DEFINITIONS ---
type BinStatus = 'Critical' | 'Warning' | 'Normal' | 'Operational';
interface Bin {
  id: string;
  location: string;
  status: BinStatus;
  fillLevel: number;
  lastEmptied: string;
  coords: [number, number];
}

// --- MOCK DATA & CONFIG ---
const BINS_DATA: Bin[] = [
  { id: 'SB-001', location: 'Main Entrance', status: 'Critical', fillLevel: 95, lastEmptied: '2 days ago', coords: [51.505, -0.09] },
  { id: 'SB-002', location: 'Cafeteria', status: 'Warning', fillLevel: 78, lastEmptied: '1 day ago', coords: [51.51, -0.1] },
  { id: 'SB-003', location: 'Office Area', status: 'Normal', fillLevel: 42, lastEmptied: '4 hours ago', coords: [51.515, -0.12] },
  { id: 'SB-004', location: 'Floor 2, West Wing', status: 'Normal', fillLevel: 35, lastEmptied: '8 hours ago', coords: [51.52, -0.11]},
  { id: 'SB-005', location: 'Parking Garage P1', status: 'Operational', fillLevel: 15, lastEmptied: '3 hours ago', coords: [51.50, -0.115]},
];

const STATUS_CONFIG = {
  Total: { icon: <Trash2Icon className="w-5 h-5"/>, color: 'gray', count: BINS_DATA.length },
  Operational: { icon: <CheckCircleIcon className="w-5 h-5"/>, color: 'green', count: BINS_DATA.filter(b => b.status === 'Operational' || b.status === 'Normal').length },
  'Needs Attention': { icon: <AlertCircleIcon className="w-5 h-5"/>, color: 'orange', count: BINS_DATA.filter(b => b.status === 'Warning').length },
  Critical: { icon: <AlertTriangleIcon className="w-5 h-5"/>, color: 'red', count: BINS_DATA.filter(b => b.status === 'Critical').length },
};

// --- SUB-COMPONENTS ---

const StatusCard: React.FC<{ title: string }> = ({ title }) => {
    const config = STATUS_CONFIG[title as keyof typeof STATUS_CONFIG];
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
                    <h3 className="text-2xl font-bold text-gray-800">{config.count}</h3>
                </div>
                <div className={`p-3 rounded-full ${C.iconBg} ${C.iconText}`}>
                    {config.icon}
                </div>
            </div>
        </div>
    );
};

const BinTableRow: React.FC<{ bin: Bin, onRowClick: (bin: Bin) => void }> = ({ bin, onRowClick }) => {
    const statusStyles: Record<BinStatus, string> = {
        Critical: 'bg-red-100 text-red-800',
        Warning: 'bg-orange-100 text-orange-800',
        Normal: 'bg-green-100 text-green-800',
        Operational: 'bg-green-100 text-green-800'
    };
    const progressStyles: Record<BinStatus, string> = {
        Critical: 'bg-red-500',
        Warning: 'bg-orange-500',
        Normal: 'bg-green-500',
        Operational: 'bg-green-500'
    };

    return (
        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(bin)}>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Trash2Icon className="text-gray-600" />
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{bin.id}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bin.location}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[bin.status]}`}>
                    {bin.status}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${progressStyles[bin.status]}`} style={{ width: `${bin.fillLevel}%` }}></div>
                        </div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{bin.fillLevel}%</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bin.lastEmptied}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-amber-600 hover:text-amber-900 mr-4" onClick={(e) => { e.stopPropagation(); alert(`Editing ${bin.id}`); }}>
                    <EditIcon className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-900" onClick={(e) => { e.stopPropagation(); alert(`Deleting ${bin.id}`); }}>
                    <TrashIcon className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
};

const Charts: React.FC = () => {
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
            statusChart = new Chart(statusChartRef.current, {
                type: 'doughnut', data: { labels: ['Operational', 'Warning', 'Critical'], datasets: [{ data: [STATUS_CONFIG.Operational.count, STATUS_CONFIG['Needs Attention'].count, STATUS_CONFIG.Critical.count], backgroundColor: ['#22c55e', '#f97316', '#ef4444'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
            });
        }
        return () => {
            weeklyChart?.destroy();
            statusChart?.destroy();
        };
    }, []);

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

const Map: React.FC<{ bins: Bin[], onMarkerClick: (bin: Bin) => void }> = ({ bins, onMarkerClick }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const isMapInitialized = useRef(false);

    useEffect(() => {
        if (mapRef.current && !isMapInitialized.current) {
            const map = L.map(mapRef.current).setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const binIcon = L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484613.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            bins.forEach(bin => {
                const marker = L.marker(bin.coords, { icon: binIcon }).addTo(map)
                    .bindPopup(`<b>${bin.id}</b><br>Status: ${bin.status}`);
                marker.on('click', () => onMarkerClick(bin));
            });
            isMapInitialized.current = true;
        }
    }, [bins, onMarkerClick]);
    
    return (
         <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Bin Locations</h2>
            <div id="map" ref={mapRef} className="h-[400px] rounded-lg"></div>
        </div>
    );
}

const BinDetailsModal: React.FC<{ bin: Bin | null, onClose: () => void }> = ({ bin, onClose }) => {
    if (!bin) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Bin Details: {bin.id}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-700">Basic Information</h4>
                            <div className="space-y-2">
                                <div><label className="text-sm text-gray-500">Location</label><p className="font-medium text-gray-800">{bin.location}</p></div>
                                <div><label className="text-sm text-gray-500">Installation Date</label><p className="font-medium text-gray-800">2023-05-15</p></div>
                                <div><label className="text-sm text-gray-500">Last Emptied</label><p className="font-medium text-gray-800">{bin.lastEmptied}</p></div>
                            </div>
                        </div>
                        <div>
                           <h4 className="font-semibold mb-2 text-gray-700">Current Status</h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-sm text-gray-500">Fill Level</label>
                                    <p className="font-medium text-gray-800">{bin.fillLevel}%</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Status</label>
                                    <p className="font-medium text-gray-800">{bin.status}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h4 className="font-semibold mb-2 text-gray-700">Actions</h4>
                        <div className="flex space-x-3">
                            <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition">Mark as Emptied</button>
                            <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">Request Service</button>
                            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">View History</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const SmartBinDashboard: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

    const handleRowClick = (bin: Bin) => {
        setSelectedBin(bin);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBin(null);
    };

    return (
        <div className="flex flex-col gap-6">
            <BinDetailsModal bin={selectedBin} onClose={closeModal} />
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Smart Bin Project Dashboard</h1>
                    <div className="relative w-full sm:w-auto">
                        <input type="text" placeholder="Search bins..." className="w-full sm:w-auto pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"/>
                        <SearchIcon className="absolute left-3 top-2.5 text-gray-400 w-5 h-5"/>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatusCard title="Total" />
                    <StatusCard title="Operational" />
                    <StatusCard title="Needs Attention" />
                    <StatusCard title="Critical" />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fill Level</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Emptied</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {BINS_DATA.map(bin => <BinTableRow key={bin.id} bin={bin} onRowClick={handleRowClick} />)}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <Charts />
            <Map bins={BINS_DATA} onMarkerClick={handleRowClick} />
        </div>
    );
};

export default SmartBinDashboard;
