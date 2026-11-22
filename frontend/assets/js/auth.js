/**
 * Krishi Mitra — Farmer Direct Authentication Handler
 * Authenticates farmer via Farmer ID only (NO PASSWORD)
 */

function quickFill(farmerId) {
    const input = document.getElementById('farmerId');
    if (input) {
        input.value = farmerId;
        input.focus();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('farmerLoginForm');
    const farmerIdInput = document.getElementById('farmerId');
    const alertBox = document.getElementById('login-alert');
    const btnSubmit = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnIcon = document.getElementById('btn-icon');

    if (!loginForm) return;

    // Check if user is already logged in
    const existing = window.KrishiAPI ? window.KrishiAPI.getLoggedInFarmer() : null;
    if (existing && existing.farmer && existing.farmer.farmer_id) {
        farmerIdInput.value = existing.farmer.farmer_id;
    }

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        alertBox.classList.add('d-none');
        alertBox.textContent = '';

        const farmerId = parseInt(farmerIdInput.value.trim());
        if (isNaN(farmerId) || farmerId <= 0) {
            alertBox.textContent = 'Please enter a valid Farmer User ID between 1 and 100.';
            alertBox.classList.remove('d-none');
            return;
        }

        // Show loading state
        btnSubmit.disabled = true;
        btnText.textContent = 'Verifying Record...';
        btnSpinner.classList.remove('d-none');
        btnIcon.classList.add('d-none');

        try {
            const profile = await window.KrishiAPI.getFarmerDetails(farmerId);
            if (profile && profile.found) {
                // Save profile to localStorage
                window.KrishiAPI.setLoggedInFarmer(profile);
                
                btnText.textContent = `Welcome, ${profile.farmer.full_name}! Redirecting...`;
                btnSubmit.classList.remove('btn-login');
                btnSubmit.classList.add('btn', 'btn-success');
                
                setTimeout(() => {
                    window.location.href = 'index.html?view=farmer';
                }, 400);
            } else {
                throw new Error(`Farmer ID #${farmerId} was not found in the national registry.`);
            }
        } catch (err) {
            alertBox.textContent = err.message || `Failed to verify Farmer #${farmerId}. Please check backend connection.`;
            alertBox.classList.remove('d-none');
            btnSubmit.disabled = false;
            btnText.textContent = '🌾 Sign In to Farmer Portal';
            btnSpinner.classList.add('d-none');
            btnIcon.classList.remove('d-none');
        }
    });
});
