// File: js/driver.js

let currentDriver = null;
let isTransmitting = false;
let watchId = null;
let transmitInterval = null;

// Tambahkan library supabase di index HTML (sudah ada)
// File ini bergantung pada js/supabase-client.js

document.addEventListener('DOMContentLoaded', () => {
    // Cek session lokal penyimpanan
    const savedSession = localStorage.getItem('driver_session');
    if (savedSession) {
        currentDriver = JSON.parse(savedSession);
        showTransmitSection();
    }

    // Attach Event Listeners
    document.getElementById('driver-auth-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-toggle-location').addEventListener('click', toggleTransmit);
});

async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errEl = document.getElementById('login-error');

    errEl.classList.add('hidden');
    
    // Ganti button text ke loading (Opsional UX)
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Memeriksa...';
    btn.disabled = true;

    // Login manual: cek kecocokan username dan password di tabel drivers
    const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('username', user)
        .eq('password', pass)
        .single();

    btn.innerText = originalText;
    btn.disabled = false;

    if (error || !data) {
        errEl.innerText = 'Username atau Password salah!';
        errEl.classList.remove('hidden');
        return;
    }

    // Sukses
    currentDriver = data;
    localStorage.setItem('driver_session', JSON.stringify(data));
    showTransmitSection();
}

function handleLogout() {
    if (isTransmitting) {
        toggleTransmit(); // Matikan dulu sebelum logout
    }
    currentDriver = null;
    localStorage.removeItem('driver_session');
    
    document.getElementById('driver-auth-form').reset();
    document.getElementById('transmit-section').classList.add('hidden');
    document.getElementById('transmit-section').classList.remove('flex');
    document.getElementById('login-section').classList.remove('hidden');
}

function showTransmitSection() {
    document.getElementById('login-section').classList.add('hidden');
    
    const ui = document.getElementById('transmit-section');
    ui.classList.remove('hidden');
    ui.classList.add('flex');

    // Update profil info
    document.getElementById('driver-name-display').innerText = currentDriver.full_name;
    document.getElementById('driver-plate-display').innerText = `${currentDriver.vehicle_plate} • ${currentDriver.route}`;
}

async function toggleTransmit() {
    const btn = document.getElementById('btn-toggle-location');
    const btnText = document.getElementById('btn-text');
    const svgIcon = btn.querySelector('svg');
    const statusTitle = document.getElementById('status-title');
    const statusDesc = document.getElementById('status-description');
    const ripple1 = document.getElementById('ripple-1');
    const ripple2 = document.getElementById('ripple-2');

    if (!isTransmitting) {
        // MINTA IZIN LOKASI
        if (!navigator.geolocation) {
            alert('Perangkat/Browser Anda tidak mendukung GPS!');
            return;
        }

        isTransmitting = true;

        // UI Perubahan: Aktif (Gojek Hijau)
        btn.classList.remove('bg-gray-200', 'text-gray-500', 'border-white');
        btn.classList.add('bg-gojek-green', 'text-white', 'border-gojek-light');
        btnText.innerText = 'AKTIF';
        statusTitle.innerText = 'Peta Sedang Aktif';
        statusTitle.classList.add('text-gojek-green');
        statusDesc.innerText = 'Lokasi GPS Anda saat ini sedang disiarkan ke siswa.';
        ripple1.classList.remove('opacity-0');
        ripple2.classList.remove('opacity-0');

        // Ganti Ikon jadi Stop Square
        svgIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />`;

        // MINTA LOKASI PERTAMA KALI LALU BUAT INTERVAL 5 DETIK
        sendCurrentLocation();
        transmitInterval = setInterval(sendCurrentLocation, 5000);

    } else {
        // MATIKAN TRANSMIT
        isTransmitting = false;
        if (transmitInterval !== null) {
            clearInterval(transmitInterval);
            transmitInterval = null;
        }

        // UI Perubahan: Mati (Abu-abu)
        btn.classList.add('bg-gray-200', 'text-gray-500', 'border-white');
        btn.classList.remove('bg-gojek-green', 'text-white', 'border-gojek-light');
        btnText.innerText = 'MULAI';
        statusTitle.innerText = 'Peta Belum Aktif';
        statusTitle.classList.remove('text-gojek-green');
        statusDesc.innerText = 'Tekan tombol di atas untuk mulai membagikan lokasi Anda kepada siswa.';
        ripple1.classList.add('opacity-0');
        ripple2.classList.add('opacity-0');

        // Kembalikan Ikon Panah
        svgIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />`;
        
        document.getElementById('gps-coords').innerText = '-';
    }
}

function sendCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            document.getElementById('gps-coords').innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

            // PUSH KE SUPABASE
            const { error } = await supabase
                .from('driver_locations')
                .upsert({
                    driver_id: currentDriver.id,
                    latitude: lat,
                    longitude: lng,
                    updated_at: new Date().toISOString()
                });
                
            if (error) {
                console.error("Gagal update lokasi ke DB:", error);
            }
        },
        (err) => {
            console.error('Error GPS:', err);
            document.getElementById('gps-coords').innerText = `Error: ${err.message}`;
            if(err.code === 1) {
                alert('Mohon izinkan akses lokasi (GPS) di browser Anda untuk menggunakan aplikasi.');
                toggleTransmit(); // matikan karena error izin
            }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}
