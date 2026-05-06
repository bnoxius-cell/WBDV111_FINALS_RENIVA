// Manages all interactions with localStorage (the "database")

import { supabase } from './supabase-client.js';

let bookingsCache = [];
let propertiesCache = [];

// Fetch everything from Supabase on page load
export const fetchInitialData = async () => {
    const { data: reservations } = await supabase.from('reservations').select('*');
    if (reservations) bookingsCache = reservations;

    const { data: properties } = await supabase.from('properties').select('*');
    if (properties && properties.length > 0) propertiesCache = properties;
};

export const getBookings = () => bookingsCache; // Keep synchronous for UI speed

export const saveBooking = async (booking) => {
    const existingIndex = bookingsCache.findIndex(b => b.id === booking.id);
    if (existingIndex > -1) {
        const { error } = await supabase.from('reservations').update(booking).eq('id', booking.id);
        if (error) {
            console.error("Error updating booking in Supabase:", error);
            return { success: false, error: error.message };
        }
        bookingsCache[existingIndex] = booking;
    } else {
        const { error } = await supabase.from('reservations').insert([booking]);
        if (error) {
            console.error("Error inserting booking into Supabase:", error);
            return { success: false, error: error.message };
        }
        bookingsCache.push(booking);
    }
    return { success: true };
};

export const initProperties = async () => {
    // Auto-seeding removed. Properties are now exclusively managed via the Admin Dashboard.
};

export const getProperties = () => propertiesCache;

export const saveProperty = async (property) => {
    const existingIndex = propertiesCache.findIndex(p => p.id === property.id);
    if (existingIndex > -1) {
        propertiesCache[existingIndex] = property;
        const { error } = await supabase.from('properties').update(property).eq('id', property.id);
        if (error) {
            console.error("Error updating property in Supabase:", error);
            return { success: false, error: error.message };
        }
    } else {
        const { error } = await supabase.from('properties').insert([property]);
        if (error) {
            console.error("Error inserting property into Supabase:", error);
            return { success: false, error: error.message };
        }
        propertiesCache.push(property); // Only add to cache if database insert succeeds!
    }
    return { success: true };
};

export const deleteProperty = async (propertyId) => {
    propertiesCache = propertiesCache.filter(p => p.id !== propertyId);
    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    if (error) {
        console.error("Error deleting property:", error);
    }
};

export const syncProperties = async () => {
    const cards = document.querySelectorAll('.listing-card');
    if (cards.length === 0) return;
    
    let props = getProperties();
    let updated = false;
    let newPropsToInsert = [];
    const extraImages = ['img-room1', 'img-pool', 'img-view', 'img-room2', 'img-bathroom', 'img-kitchen'];

    cards.forEach((card, index) => {
        // Skip dynamically generated trending cards so we don't duplicate them
        if (card.closest('#trending-destinations-grid')) return;

        const name = card.querySelector('h3')?.textContent.trim();
        if (!name) return;

        let existingProp = props.find(p => p.name === name);
        if (!existingProp) {
            const locationText = card.querySelector('.location')?.textContent.trim() || '';
            const priceText = card.querySelector('.price')?.textContent || '';
            const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
            
            const baseImg = Array.from(card.querySelector('.card-image')?.classList || []).find(c => c.startsWith('img-')) || 'img-neon';
            const imgs = [baseImg, extraImages[index % extraImages.length], extraImages[(index + 1) % extraImages.length], extraImages[(index + 2) % extraImages.length]];
            
            existingProp = {
                id: 'p_sync_' + Date.now() + index,
                name: name,
                location: locationText,
                price: price,
                type: card.dataset.type || 'studio',
                rating: 0,
                reviews: 0,
                imageClass: baseImg,
                images: imgs,
                availableStart: card.dataset.availableStart || '2000-01-01',
                availableEnd: card.dataset.availableEnd || '2099-12-31',
                guests: parseInt(card.dataset.guests) || 2,
                beds: card.querySelectorAll('.text-muted')[1]?.textContent.trim() || '1 Bedroom'
            };
            props.push(existingProp);
            newPropsToInsert.push(existingProp);
            updated = true;
        }

        // Update the hardcoded HTML element with the local storage rating!
        const ratingContainer = card.querySelector('.card-rating');
        if (ratingContainer) {
            ratingContainer.innerHTML = `
                <span class="text-muted" style="margin-right: 0.25rem; font-size: 0.85rem;">Avg Rating:</span>
                <span class="text-primary">★ ${existingProp.rating > 0 ? existingProp.rating.toFixed(1) : 'New'}</span>
                <span class="text-muted" style="margin-left: 0.25rem;">(${existingProp.reviews} reviews)</span>
            `;
        }
    });

    if (updated) {
        if (newPropsToInsert.length > 0) {
            await supabase.from('properties').insert(newPropsToInsert);
        }
    }
};