// Manages all modal dialogs (property details, login prompts, reviews, etc.)

import { getProperties, getBookings } from '../services/storage.js';
import { renderUserBookings } from '../features/booking.js';

// Login Prompt Modal Logic
export const showLoginPromptModal = () => {
    let modal = document.getElementById('login-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'login-prompt-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="card text-center m-0 mx-1 max-w-400">
                <h2 class="mb-2">Authentication Required</h2>
                <p class="subtitle mb-4">Please login or register to book a property.</p>
                <div class="flex-col gap-1">
                    <button id="login-redirect-btn" class="btn btn-primary btn-glow w-100">Go to Login</button>
                    <button id="cancel-prompt-btn" class="btn btn-outline w-100">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('login-redirect-btn').addEventListener('click', () => window.location.href = '../general/auth.html');
        document.getElementById('cancel-prompt-btn').addEventListener('click', () => modal.classList.add('hidden'));
    }
    modal.classList.remove('hidden');
};

// Terms & Conditions Modal Logic
export const showTermsModal = () => {
    let modal = document.getElementById('terms-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'terms-modal';
        modal.className = 'modal-overlay hidden';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="card m-0 mx-1 max-w-800 w-100" style="max-height: 90vh; display: flex; flex-direction: column;">
            <h2 class="mb-2 text-primary">Terms & Cancellation Policy</h2>
            <div class="glass-panel-soft p-4 mb-3" style="overflow-y: auto; border-radius: 8px; flex: 1; text-align: left;">
                <h4 class="text-gold mb-2">Cancellation Policy</h4>
                <p class="text-muted mb-3" style="font-size: 0.95rem;">You can cancel your booking for a full refund up to 7 days before your check-in date. Cancellations made within 7 days of the check-in date are subject to a 50% cancellation fee. Same-day cancellations or no-shows are non-refundable.</p>
                
                <h4 class="text-gold mb-2">Damages & Breakages</h4>
                <p class="text-muted mb-0" style="font-size: 0.95rem;">We understand accidents happen! Please report any damages to our Support Queue immediately. Minor breakages (like a shattered glass) are usually covered, but significant damage to furniture or appliances will be billed to the payment method on file.</p>
            </div>
            <button id="close-terms-btn" class="btn btn-primary w-100">I Understand</button>
        </div>
    `;
    modal.classList.remove('hidden');
    document.getElementById('close-terms-btn').onclick = () => modal.classList.add('hidden');
};

// Cancellation Calculation & Modal Logic
export const showCancelModal = (booking) => {
    let modal = document.getElementById('cancel-booking-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cancel-booking-modal';
        modal.className = 'modal-overlay hidden';
        document.body.appendChild(modal);
    }

    const totalPaid = parseFloat(booking.price.replace(/[^\d.]/g, '')) || 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkinDate = new Date(booking.checkin + 'T00:00:00');
    const diffTime = checkinDate - today;
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let feePercentage = 0;
    if (daysUntil <= 0) feePercentage = 1;
    else if (daysUntil <= 7) feePercentage = 0.5;

    const feeAmount = totalPaid * feePercentage;
    const refundAmount = totalPaid - feeAmount;

    let policyText = '';
    if (daysUntil > 7) policyText = 'You are canceling more than 7 days before check-in. You are eligible for a <strong class="text-green">full refund</strong>.';
    else if (daysUntil > 0) policyText = 'You are canceling within 7 days of check-in. A <strong class="text-crimson">50% cancellation fee</strong> applies.';
    else policyText = '<strong class="text-crimson">Same-day cancellations or no-shows are non-refundable.</strong>';

    modal.innerHTML = `
        <div class="card m-0 mx-1 max-w-400 w-100">
            <h2 class="mb-1 text-crimson">Cancel Booking</h2>
            <p class="text-primary font-bold mb-2">${booking.property}</p>
            <p class="text-muted text-sm mb-3">Check-in: ${new Date(booking.checkin + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>

            <div class="glass-panel-soft p-3 mb-3" style="border-radius: 8px;">
                <p class="mb-3 text-sm text-muted" style="line-height: 1.4;">${policyText}</p>
                <div class="mb-1" style="display: flex; justify-content: space-between;">
                    <span class="text-muted">Total Paid:</span>
                    <span class="font-bold">₱${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="mb-1 text-crimson" style="display: flex; justify-content: space-between;">
                    <span>Cancellation Fee:</span>
                    <span>- ₱${feeAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="border-t pt-2 mt-2 text-green font-bold" style="display: flex; justify-content: space-between; border-color: rgba(255,255,255,0.1);">
                    <span>Refund Amount:</span>
                    <span>₱${refundAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
            </div>

            <div class="flex-col gap-1 mt-3">
                <button id="confirm-cancel-btn" class="btn btn-danger btn-glow w-100">Confirm Cancellation</button>
                <button id="abort-cancel-btn" class="btn btn-outline w-100">Keep My Booking</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    document.getElementById('abort-cancel-btn').onclick = () => modal.classList.add('hidden');
    document.getElementById('confirm-cancel-btn').onclick = () => {
        const bookings = getBookings();
        const bIdx = bookings.findIndex(b => b.id === booking.id);
        if (bIdx > -1) {
            bookings[bIdx].status = 'canceled';
            localStorage.setItem('bookings', JSON.stringify(bookings));
            renderUserBookings();
            modal.classList.add('hidden');
            
            setTimeout(() => alert('Booking canceled successfully. Your refund is being processed.'), 100);
        }
    };
};

// Global interval variable for the carousel auto-play
window.modalCarouselInterval = null;

// Property Details Modal Logic
export const initPropertyModalUI = () => {
    if (document.getElementById('property-details-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'property-details-modal';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
        <div class="card glass-panel p-0 max-w-1000 w-100 property-modal-content mx-1">
            <button id="property-modal-close" class="property-modal-close" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div class="property-modal-carousel">
                <div id="property-modal-image-track" style="display: flex; height: 100%; transition: transform 0.3s ease; width: 100%;"></div>
                <button id="modal-prev-img" class="carousel-nav-btn left">&lt;</button>
                <button id="modal-next-img" class="carousel-nav-btn right">&gt;</button>
                <div id="modal-img-indicators" style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index:10;"></div>
            </div>
            <div class="property-modal-body">
                <div class="flex-between flex-wrap gap-1">
                    <div>
                        <h2 id="property-modal-title" class="text-primary mb-0" style="font-size: 1.75rem;">Property Name</h2>
                        <p id="property-modal-location" class="text-muted text-lg">Location &nbsp;|&nbsp; <span style="text-transform: capitalize; color: var(--primary-color); font-weight: 500;">Type</span></p>
                    </div>
                    <div class="text-right" style="text-align: right;">
                        <h3 id="property-modal-price" class="text-primary mb-0" style="font-size: 1.5rem;">₱0 / night</h3>
                        <div id="property-modal-rating" class="card-rating justify-end mt-1">★ New (0 reviews)</div>
                    </div>
                </div>
                
                <div class="grid-2-col gap-1 border-t pt-3 border-b pb-3">
                    <div class="flex-align-center text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span class="ml-2">Recommended: <span id="property-modal-guests" class="font-bold text-primary">2</span> person(s)</span>
                    </div>
                    <div class="flex-align-center text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                        <span class="ml-2">Layout: <span id="property-modal-beds" class="font-bold text-primary">1 Bedroom</span></span>
                    </div>
                </div>

                <div class="property-modal-reviews-container">
                    <h3 class="mb-2 text-cyan">Guest Reviews</h3>
                    <div id="property-modal-reviews-list" class="property-modal-reviews-scroll">
                        <!-- Reviews will be injected here -->
                    </div>
                </div>
                <button id="property-modal-book-btn" class="btn btn-primary btn-glow w-100 mt-2" style="font-size: 1.1rem;">Book This Property</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            clearInterval(window.modalCarouselInterval);
        }
    });

    document.getElementById('property-modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        clearInterval(window.modalCarouselInterval);
    });
};

export const openPropertyModal = (card) => {
    const modal = document.getElementById('property-details-modal');
    if (!modal) return;

    const nameNode = card.querySelector('h3') || card.querySelector('h4');
    if (!nameNode) return;
    const name = nameNode.textContent.trim();
    
    // Find property in local storage for full details
    const props = getProperties();
    const propData = props.find(p => p.name === name);

    const locationNode = card.querySelector('.location');
    const location = locationNode ? locationNode.textContent.trim() : (propData?.location || 'Unknown Location');
    
    const priceNode = card.querySelector('.price');
    const price = priceNode ? priceNode.textContent.trim() : (propData ? `₱${propData.price.toLocaleString()} / night` : '₱0 / night');
    
    const guests = card.dataset?.guests || propData?.guests || '2';

    document.getElementById('property-modal-title').textContent = name;
    document.getElementById('property-modal-location').innerHTML = `${location} &nbsp;|&nbsp; <span style="text-transform: capitalize; color: var(--primary-color); font-weight: 500;">${propData?.type || card.dataset?.type || 'Studio'}</span>`;
    document.getElementById('property-modal-price').textContent = price;
    document.getElementById('property-modal-guests').textContent = propData?.guests || guests || '2';
    document.getElementById('property-modal-beds').textContent = propData?.beds || '1 Bedroom';
    
    // Setup image carousel
    const cardImageNode = card.querySelector('.card-image');
    const baseImgClass = propData?.imageClass || (cardImageNode ? Array.from(cardImageNode.classList).find(c => c.startsWith('img-')) : 'img-neon');
    let images = propData?.images;
    if (!images || images.length === 0) {
        images = [baseImgClass, 'img-room1', 'img-view', 'img-bathroom'];
    }

    const track = document.getElementById('property-modal-image-track');
    const indicators = document.getElementById('modal-img-indicators');
    
    track.innerHTML = images.map(img => `<div class="property-modal-hero ${img}" style="min-width: 100%;"></div>`).join('');
    indicators.innerHTML = images.map((_, i) => `<div class="img-indicator" style="width: 8px; height: 8px; border-radius: 50%; background: ${i===0?'var(--primary-color)':'rgba(255,255,255,0.5)'}; transition: background 0.3s; cursor: pointer;"></div>`).join('');
    
    let currentImgIdx = 0;
    const updateCarousel = () => {
        track.style.transform = `translateX(-${currentImgIdx * 100}%)`;
        Array.from(indicators.children).forEach((dot, i) => {
            dot.style.background = i === currentImgIdx ? 'var(--primary-color)' : 'rgba(255,255,255,0.5)';
        });
    };
    
    const startAutoSlide = () => {
        clearInterval(window.modalCarouselInterval);
        window.modalCarouselInterval = setInterval(() => {
            currentImgIdx = (currentImgIdx < images.length - 1) ? currentImgIdx + 1 : 0;
            updateCarousel();
        }, 1750); // Flips every 1.75 seconds
    };
    
    const prevBtn = document.getElementById('modal-prev-img');
    const nextBtn = document.getElementById('modal-next-img');
    
    const newPrev = prevBtn.cloneNode(true);
    const newNext = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);
    
    newPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIdx = (currentImgIdx > 0) ? currentImgIdx - 1 : images.length - 1;
        updateCarousel();
        startAutoSlide(); // Reset timer on manual interaction
    });
    
    newNext.addEventListener('click', (e) => {
        e.stopPropagation();
        currentImgIdx = (currentImgIdx < images.length - 1) ? currentImgIdx + 1 : 0;
        updateCarousel();
        startAutoSlide(); // Reset timer on manual interaction
    });

    Array.from(indicators.children).forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImgIdx = i;
            updateCarousel();
            startAutoSlide(); // Reset timer on manual interaction
        });
    });

    // Start auto-play immediately when modal opens
    startAutoSlide();

    // Rating
    const ratingHtml = `
        <span class="text-primary">★ ${propData && propData.rating > 0 ? propData.rating.toFixed(1) : 'New'}</span>
        <span class="text-muted ml-2">(${propData?.reviews || 0} reviews)</span>
    `;
    document.getElementById('property-modal-rating').innerHTML = ratingHtml;

    // Reviews
    const reviewsContainer = document.getElementById('property-modal-reviews-list');
    const allBookings = getBookings();
    const propertyReviews = allBookings.filter(b => b.property === name && b.status === 'past' && b.userRating);

    if (propertyReviews.length > 0) {
        reviewsContainer.innerHTML = propertyReviews.map(r => `
            <div class="review-card">
                <div class="flex-between mb-1">
                    <strong class="text-capitalize text-cyan">${r.user}</strong>
                    <span class="text-gold font-bold">★ ${r.userRating}/5</span>
                </div>
                <p class="text-muted text-sm mb-0">"${r.userReview}"</p>
            </div>
        `).join('');
    } else {
        reviewsContainer.innerHTML = '<p class="text-muted text-center py-3">No reviews yet. Be the first to leave one!</p>';
    }

    // Match button logic with the actual card
    const bookBtn = document.getElementById('property-modal-book-btn');
    const cardBookBtn = card.querySelector('.book-btn');
    
    bookBtn.onclick = () => {
        if (cardBookBtn && cardBookBtn.disabled) {
            alert('This property is fully booked for your selected dates.');
        } else if (cardBookBtn) {
            cardBookBtn.click();
        } else {
            window.location.href = '../general/reservations.html';
        }
    };
    
    if (cardBookBtn && cardBookBtn.disabled) {
        bookBtn.disabled = true;
        bookBtn.textContent = 'Unavailable for Selected Dates';
        bookBtn.classList.remove('btn-primary', 'btn-glow');
        bookBtn.classList.add('btn-outline');
    } else {
        bookBtn.disabled = false;
        bookBtn.textContent = 'Book This Property';
        bookBtn.classList.remove('btn-outline');
        bookBtn.classList.add('btn-primary', 'btn-glow');
    }

    document.body.classList.add('modal-open');
    modal.classList.remove('hidden');
};