// Renders dynamic listing content, like trending properties and tickers

import { getBookings, getProperties } from '../services/storage.js';
import { setupBookingButtons } from './booking.js';

export const updateRecentTicker = () => {
    const ticker = document.getElementById('recent-booking-ticker');
    const tickerText = document.getElementById('ticker-text');
    if (ticker && tickerText) {
        const currentUser = sessionStorage.getItem('currentUser');
        
        if (!currentUser) {
            ticker.classList.add('hidden');
            return;
        }

        const allBookings = getBookings();
        const userBookings = allBookings.filter(b => b.user === currentUser);

        if (userBookings.length > 0) {
            const recent = userBookings.slice(-3).reverse(); // Get latest 3 specific to the user
            const propertyNames = recent.map(b => b.property);
            
            let displayText = '';
            if (propertyNames.length === 1) {
                displayText = propertyNames[0];
            } else if (propertyNames.length === 2) {
                displayText = `${propertyNames[0]} and ${propertyNames[1]}`;
            } else {
                displayText = `${propertyNames[0]}, ${propertyNames[1]}, and ${propertyNames[2]}`;
            }

            tickerText.innerHTML = `<span class="text-primary font-bold">Your Recent Bookings:</span> ${displayText}`;
            ticker.classList.remove('hidden');
        } else {
            ticker.classList.add('hidden');
        }
    }
};

export const renderTrendingDestinations = () => {
    const grid = document.getElementById('trending-destinations-grid');
    if (grid) {
        let props = getProperties();
        
        props.sort((a, b) => {
            if (b.rating === a.rating) return Math.random() - 0.5;
            return b.rating - a.rating;
        });

        const topProps = props.slice(0, 3);

        grid.innerHTML = topProps.map(p => `
            <div class="listing-card" data-location="${p.location.toLowerCase()}" data-guests="${p.guests}" data-type="${p.type || 'studio'}" data-available-start="${p.availableStart}" data-available-end="${p.availableEnd}" data-rate="${p.price}">
                <div class="card-image ${p.imageClass}"></div>
                <div class="card-content">
                    <h3>${p.name}</h3>
                    <p class="location" style="margin-bottom: 0.25rem;">${p.location}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem; text-transform: capitalize;">Type: ${p.type || 'Studio'}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem;">Recommended: ${p.guests} person(s)</p>
                    <p class="text-muted mb-2" style="font-size: 0.85rem;">${p.beds || '1 Bedroom'}</p>
                    <p class="price">₱${p.price.toLocaleString()} / night</p>
                    <div class="card-rating mb-3">
                        <span class="text-muted" style="margin-right: 0.25rem; font-size: 0.85rem;">Avg Rating:</span>
                        <span class="text-primary">★ ${p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
                        <span class="text-muted" style="margin-left: 0.25rem;">(${p.reviews} reviews)</span>
                    </div>
                    <button class="btn btn-outline w-100 book-btn">Book Now</button>
                </div>
            </div>
        `).join('');
        
        setupBookingButtons(); // Re-bind the checkout events to these newly injected buttons
    }
};

export const renderAllProperties = () => {
    const grid = document.getElementById('all-properties-grid');
    if (grid) {
        let props = getProperties();
        grid.innerHTML = props.map(p => `
            <div class="listing-card" data-location="${p.location.toLowerCase()}" data-guests="${p.guests}" data-type="${p.type || 'studio'}" data-available-start="${p.availableStart}" data-available-end="${p.availableEnd}" data-rate="${p.price}">
                <div class="card-image ${p.imageClass}"></div>
                <div class="card-content">
                    <h3>${p.name}</h3>
                    <p class="location" style="margin-bottom: 0.25rem;">${p.location}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem; text-transform: capitalize;">Type: ${p.type || 'Studio'}</p>
                    <p class="text-muted mb-1" style="font-size: 0.85rem;">Recommended: ${p.guests} person(s)</p>
                    <p class="text-muted mb-2" style="font-size: 0.85rem;">${p.beds || '1 Bedroom'}</p>
                    <p class="price">₱${p.price.toLocaleString()} / night</p>
                    <div class="card-rating mb-3">
                        <span class="text-muted" style="margin-right: 0.25rem; font-size: 0.85rem;">Avg Rating:</span>
                        <span class="text-primary">★ ${p.rating > 0 ? p.rating.toFixed(1) : 'New'}</span>
                        <span class="text-muted" style="margin-left: 0.25rem;">(${p.reviews} reviews)</span>
                    </div>
                    <button class="btn btn-outline w-100 book-btn">Book Now</button>
                </div>
            </div>
        `).join('');
        
        setupBookingButtons(); // Bind the checkout events to these buttons
    }
};