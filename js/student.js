// File: js/student.js
// Logika untuk Peta Siswa

let map;
let markers = {}; // Menyimpan marker untuk setiap driver_id
let studentMarker = null; // Marker untuk posisi siswa sendiri
let activeRouteLayer = null; // Layer rute yang sedang aktif di peta
let activeRouteName = null; // Nama rute yang sedang aktif
let fetchInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    initStudentLocation(); // Mulai lacak lokasi siswa
    await loadInitialActiveDrivers();
    
    // Listener untuk tombol lokasi saya
    document.getElementById('btn-my-location').addEventListener('click', () => {
        if (studentMarker) {
            const gps = studentMarker.getLatLng();
            map.flyTo([gps.lat, gps.lng], 16, { animate: true, duration: 1.5 });
            studentMarker.openPopup();
        } else {
            alert("Sedang mencari lokasi Anda...");
        }
    });

    // Polling data setiap 5 detik
    fetchInterval = setInterval(loadInitialActiveDrivers, 5000);
});

// Inisialisasi Peta Leaflet
function initMap() {
    // Default center (bisa disesuaikan dengan kota Anda)
    map = L.map('map', { zoomControl: false }).setView([-6.200000, 106.816666], 13);
    
    // Custom posisi zoom control
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Style Peta cerah / mirip Google Maps
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

// Custom Marker Icon mirip Angkutan Gojek
const angkotIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="bg-white border-2 border-gojek-green rounded-full p-1 shadow-lg flex items-center justify-center" style="width: 40px; height: 40px;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#00aa13" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Custom Marker untuk Siswa (Warna Biru)
const studentIcon = L.divIcon({
    className: 'student-div-icon',
    html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping-slow"></div>
            <div class="bg-white border-2 border-blue-500 rounded-full p-1.5 shadow-lg flex items-center justify-center relative z-10" style="width: 34px; height: 34px;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-blue-500">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
                </svg>
            </div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

function initStudentLocation() {
    if ("geolocation" in navigator) {
        // Pantau lokasi secara terus menerus (watchPosition)
        navigator.geolocation.watchPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            updateStudentMarker(lat, lng);
        }, (error) => {
            console.warn("Gagal mendapatkan lokasi siswa:", error.message);
        }, {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
        });
    }
}

function updateStudentMarker(lat, lng) {
    if (studentMarker) {
        studentMarker.setLatLng([lat, lng]);
    } else {
        studentMarker = L.marker([lat, lng], { 
            icon: studentIcon,
            zIndexOffset: 1000 // Supaya di atas angkot
        }).addTo(map);
        studentMarker.bindPopup('<b class="text-blue-600">Lokasi Saya</b>', { offset: [0, -10] });
        
        // Opsional: Center map ke siswa saat pertama kali ditemukan
        map.setView([lat, lng], 15);
    }
}

// Ambil lokasi semua driver (Dipanggil setiap 5 detik)
async function loadInitialActiveDrivers() {
    const { data: locations, error } = await supabase
        .from('driver_locations')
        .select(`
            driver_id,
            latitude,
            longitude,
            updated_at,
            drivers (
                full_name,
                vehicle_plate,
                vehicle_number,
                route
            )
        `);

    if (error) {
        console.error('Error load initial:', error);
        return;
    }

    const listContainer = document.getElementById('driver-list');
    listContainer.innerHTML = ''; // Kosongkan placeholder

    if (locations.length === 0) {
        document.getElementById('status-text').innerText = 'Tidak ada angkutan yang sedang beroperasi saat ini.';
        return;
    }

    // Melacak driver id yang aktif pada siklus tarikan server ini
    const activeDriverIdsInDB = [];

    document.getElementById('status-text').innerText = `${locations.length} armada aktif beroperasi. Memperbarui...`;

    locations.forEach(loc => {
        // Cek apakah lokasi ini masih baru (misal update terakhir < 60 menit yg lalu)
        const lastUpdated = new Date(loc.updated_at);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastUpdated) / 60000);

        // Anggap data "Aktif" jika lokasi di-update dalam kurun 1 jam terakhir
        if (diffMinutes <= 60) {
            updateMarker(loc.driver_id, loc.latitude, loc.longitude, loc.drivers);
            renderDriverToList(loc.driver_id, loc.drivers);
            
            // Tandai marker ini masih ada di server
            activeDriverIdsInDB.push(loc.driver_id);
        }
    });

    // Hapus marker dari peta jika sopir sudah tidak ada di data terbaru (berhenti aktif)
    Object.keys(markers).forEach(oldDriverId => {
        if (!activeDriverIdsInDB.includes(oldDriverId)) {
            map.removeLayer(markers[oldDriverId].marker);
            delete markers[oldDriverId];
            const cardEl = document.getElementById(`card-${oldDriverId}`);
            if(cardEl) cardEl.remove();
        }
    });
}

function updateMarker(driverId, lat, lng, driverData) {
    if (!driverData) return;

    if (markers[driverId]) {
        // Perbarui posisi
        markers[driverId].marker.setLatLng([lat, lng]);
    } else {
        // Buat marker baru
        const m = L.marker([lat, lng], {icon: angkotIcon}).addTo(map);
        
        // Popup saat di-klik
        const popupContent = `
            <div class="text-center font-sans p-2">
                <strong class="text-sm block mb-1 text-gojek-black">${driverData.full_name}</strong>
                <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">${driverData.vehicle_plate}</span>
                <p class="text-xs font-bold text-gojek-green mt-2">${driverData.route}</p>
            </div>
        `;
        m.bindPopup(popupContent, { offset: [0, -10] });

        // Tambahkan listener klik pada marker untuk menampilkan rute
        m.on('click', () => {
            showDriverRoute(driverData.route);
        });
        
        markers[driverId] = {
            marker: m,
            data: driverData
        };
    }
}

function renderDriverToList(driverId, driverData) {
    if(!driverData) return;
    const listContainer = document.getElementById('driver-list');
    
    const existingEl = document.getElementById(`card-${driverId}`);
    if(existingEl) return; // sudah ada

    const el = document.createElement('div');
    el.id = `card-${driverId}`;
    el.className = 'flex items-center justify-between p-3 border border-gray-100 rounded-2xl shadow-sm bg-white cursor-pointer hover:bg-gray-50 transition';
    
    el.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gojek-light text-gojek-green rounded-full flex items-center justify-center font-bold text-lg">
                ${driverData.vehicle_number || '?'}
            </div>
            <div>
                <h3 class="font-bold text-sm text-gojek-black">${driverData.full_name}</h3>
                <p class="text-xs text-gray-500">${driverData.vehicle_plate} • ${driverData.route}</p>
            </div>
        </div>
        <div class="text-right">
            <span class="inline-block px-2 py-1 bg-green-100 text-gojek-dark text-xs font-bold rounded-full">Aktif</span>
            <div class="mt-1 flex gap-1 justify-end">
                <span class="w-1.5 h-1.5 bg-gojek-green rounded-full animate-bounce"></span>
                <span class="w-1.5 h-1.5 bg-gojek-green rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                <span class="w-1.5 h-1.5 bg-gojek-green rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
            </div>
        </div>
    `;

    // Beri efek center map saat diklik
    el.addEventListener('click', () => {
        if(markers[driverId]) {
            const gps = markers[driverId].marker.getLatLng();
            map.flyTo([gps.lat, gps.lng], 16, { animate: true, duration: 1.5 });
            markers[driverId].marker.openPopup();
            
            // Tampilkan rute armada ini
            showDriverRoute(driverData.route);
        }
    });

    listContainer.appendChild(el);
}

/**
 * Menampilkan rute angkutan di peta dengan efek transparan
 */
async function showDriverRoute(routeName) {
    if (!routeName) return;
    
    // Jika rute ini sudah aktif, jangan render ulang
    if (activeRouteName === routeName) return;

    // Bersihkan rute sebelumnya jika ada
    if (activeRouteLayer) {
        map.removeLayer(activeRouteLayer);
        activeRouteLayer = null;
    }

    try {
        // Ambil data rute dari Supabase
        const { data: routeData, error } = await supabase
            .from('routes')
            .select('*')
            .eq('name', routeName)
            .single();

        if (error || !routeData) {
            console.warn(`Rute '${routeName}' tidak ditemukan atau belum digambar.`);
            return;
        }

        if (routeData.coordinates) {
            // Gambar GeoJSON ke peta
            activeRouteLayer = L.geoJSON(routeData.coordinates, {
                style: function() {
                    return {
                        color: routeData.color_code || '#00aa13',
                        weight: 6,
                        opacity: 0.35, // Transparan sesuai permintaan user
                        lineCap: 'round',
                        lineJoin: 'round',
                        dashArray: '1, 10' // Opsional: Beri titik-titik kecil agar terlihat premium
                    };
                }
            }).addTo(map);

            // Supaya rute selalu berada di bawah marker (Z-Index Lower)
            activeRouteLayer.bringToBack();
            
            activeRouteName = routeName;
            console.log(`Menampilkan rute: ${routeName}`);
        }
    } catch (err) {
        console.error("Gagal menampilkan rute:", err);
    }
}
