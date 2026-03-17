// File: js/admin.js

let isAdminLoggedIn = false;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();

    document.getElementById('admin-auth-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('admin-logout').addEventListener('click', handleAdminLogout);
    
    // Modal Listeners
    document.getElementById('btn-add-driver').addEventListener('click', openModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('form-driver-data').addEventListener('submit', handleSaveDriver);
});

async function checkAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        isAdminLoggedIn = true;
        showDashboard();
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errEl = document.getElementById('admin-error');
    errEl.classList.add('hidden');

    const btn = e.target.querySelector('button');
    btn.innerText = 'Loading...';
    btn.disabled = true;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    btn.innerText = 'Masuk Ke Sistem';
    btn.disabled = false;

    if (error) {
        errEl.innerText = error.message;
        errEl.classList.remove('hidden');
    } else {
        isAdminLoggedIn = true;
        showDashboard();
    }
}

async function handleAdminLogout() {
    await supabase.auth.signOut();
    isAdminLoggedIn = false;
    document.getElementById('admin-dashboard-section').classList.add('hidden');
    document.getElementById('admin-login-section').classList.remove('hidden');
    document.getElementById('admin-login-section').classList.add('flex');
}

function showDashboard() {
    document.getElementById('admin-login-section').classList.add('hidden');
    document.getElementById('admin-login-section').classList.remove('flex');
    
    const dash = document.getElementById('admin-dashboard-section');
    dash.classList.remove('hidden');
    dash.classList.add('block');

    loadDrivers();
}

// ==== CRUD DRIVERS ====

async function loadDrivers() {
    const tbody = document.getElementById('driver-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 font-medium">Memuat data sopir...</td></tr>`;

    const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-medium">Gagal memuat data: ${error.message}</td></tr>`;
        return;
    }

    if (drivers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 font-medium pb-20 pt-20">Belum ada akun sopir didaftarkan.<br><span class="text-xs text-gray-400 mt-2 block">Klik "Tambah Sopir" untuk memulai.</span></td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    
    drivers.forEach(d => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition border-b border-gray-50';
        tr.innerHTML = `
            <td class="p-4">
                <div class="font-bold text-gojek-black">${d.full_name}</div>
                <div class="text-xs text-gray-400 mt-1">ID: ${d.id.substring(0,8)}...</div>
            </td>
            <td class="p-4">
                <div class="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs uppercase tracking-wide border border-gray-200">${d.vehicle_plate}</div>
                <div class="text-xs text-gray-500 mt-1 font-medium italic">Nomor: ${d.vehicle_number || '-'} • Rute: ${d.route}</div>
            </td>
            <td class="p-4 font-medium text-sm text-gray-600">${d.phone_number || '-'}</td>
            <td class="p-4">
                <div class="text-sm font-bold bg-gojek-light text-gojek-dark inline-block px-2 py-0.5 rounded">${d.username}</div>
                <div class="text-xs text-red-400 mt-1 cursor-pointer font-mono" title="Klik untuk lihat password" onclick="alert('Password: ${d.password}')">Lihat Pass</div>
            </td>
            <td class="p-4 text-right">
                <button onclick="deleteDriver('${d.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" title="Hapus Akun">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openModal() {
    document.getElementById('form-driver-data').reset();
    document.getElementById('driver-modal').classList.remove('hidden');
    document.getElementById('driver-modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('driver-modal').classList.add('hidden');
    document.getElementById('driver-modal').classList.remove('flex');
}

async function handleSaveDriver(e) {
    e.preventDefault();
    
    // Get form values
    const newDriver = {
        username: document.getElementById('form-username').value,
        password: document.getElementById('form-password').value,
        full_name: document.getElementById('form-fullname').value,
        phone_number: document.getElementById('form-phone').value,
        vehicle_plate: document.getElementById('form-plate').value,
        vehicle_number: document.getElementById('form-vehiclenum').value,
        route: document.getElementById('form-route').value
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    const { data, error } = await supabase
        .from('drivers')
        .insert([newDriver]);

    btn.innerText = 'Simpan Data Sopir';
    btn.disabled = false;

    if (error) {
        alert("Gagal menambahkan sopir: " + error.message);
    } else {
        closeModal();
        loadDrivers(); // refresh table
    }
}

async function deleteDriver(id) {
    if(confirm('Yakin ingin menghapus akun sopir ini?')) {
        const { error } = await supabase
            .from('drivers')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert("Gagal menghapus: " + error.message);
        } else {
            loadDrivers();
        }
    }
}
