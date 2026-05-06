// Manages all interactions with localStorage (the "database")

export const getUsers = () => JSON.parse(localStorage.getItem('users')) || [];

export const saveUser = (user) => {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
};

export const getBookings = () => JSON.parse(localStorage.getItem('bookings')) || [];

export const saveBooking = (booking) => {
    const bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
};

export const initProperties = () => {
    if (!localStorage.getItem('properties')) {
        const initialProps = [
            { id: 'p1', name: 'Monumento City Loft', location: 'Caloocan City, Metro Manila', price: 3500, type: 'studio', rating: 0, reviews: 0, imageClass: 'img-neon', images: ['img-neon', 'img-room1', 'img-kitchen', 'img-bathroom'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 2, beds: '1 Studio' },
            { id: 'p2', name: 'Malabon Cozy Cabin', location: 'Malabon City, Metro Manila', price: 4200, type: 'family', rating: 0, reviews: 0, imageClass: 'img-crimson', images: ['img-crimson', 'img-room2', 'img-view', 'img-pool'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 4, beds: '2 Bedrooms' },
            { id: 'p3', name: 'Valenzuela Resort', location: 'Valenzuela City, Metro Manila', price: 5000, type: 'deluxe', rating: 0, reviews: 0, imageClass: 'img-azure', images: ['img-azure', 'img-pool', 'img-room1', 'img-view'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 6, beds: '3 Bedrooms' },
            { id: 'p4', name: 'Marilao Nature Retreat', location: 'Marilao, Bulacan', price: 4800, type: 'suite', rating: 0, reviews: 0, imageClass: 'img-emerald', images: ['img-emerald', 'img-view', 'img-room2', 'img-kitchen'], availableStart: '2024-01-01', availableEnd: '2099-12-31', guests: 2, beds: '1 Bedroom' }
        ];
        localStorage.setItem('properties', JSON.stringify(initialProps));
    }
};

export const getProperties = () => JSON.parse(localStorage.getItem('properties')) || [];

export const syncProperties = () => {
    const cards = document.querySelectorAll('.listing-card');
    if (cards.length === 0) return;
    
    let props = getProperties();
    let updated = false;
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
        localStorage.setItem('properties', JSON.stringify(props));
    }
};