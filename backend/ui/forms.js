// Initializes and manages complex custom form controls (date/time pickers, steppers)

import { getBookings } from '../services/storage.js';
import { performSearch } from '../features/search.js';

export const initSteppers = () => {
    document.querySelectorAll('.stepper-input, .stepper-input-group').forEach(container => {
        const input = container.querySelector('input[type="number"]');
        const btnDown = container.querySelector('[data-step="down"]');
        const btnUp = container.querySelector('[data-step="up"]');
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 20;

        if (!input || !btnDown || !btnUp) return;

        btnDown.addEventListener('click', () => {
            let value = parseInt(input.value) || min;
            if (value > min) {
                input.value = value - 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        btnUp.addEventListener('click', () => {
            let value = parseInt(input.value) || min;
            if (value < max) {
                input.value = value + 1;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    });
};

export const initCustomSelects = () => {
    document.querySelectorAll('.custom-select-container').forEach(container => {
        const trigger = container.querySelector('.custom-select-trigger');
        const dropdown = container.querySelector('.custom-select-dropdown');
        const hiddenInput = container.querySelector('input[type="hidden"]');
        const triggerSpan = trigger.querySelector('span');
        const options = container.querySelectorAll('.custom-select-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.calendar-popup, .time-picker-popup, .custom-select-dropdown').forEach(p => { if(p !== dropdown) p.classList.add('hidden'); });
            dropdown.classList.toggle('hidden');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                hiddenInput.value = option.dataset.value;
                triggerSpan.textContent = option.textContent;
                options.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                dropdown.classList.add('hidden');
                
                if (container.id === 'res-type-wrapper') performSearch();
            });
        });

        dropdown.addEventListener('click', e => e.stopPropagation());
    });
};

export const initCustomCalendars = () => {
    const setups = [
        { wrapperId: 'hero-dates-wrapper', triggerId: 'hero-date-trigger', checkinId: 'hero-checkin', checkoutId: 'hero-checkout', locationId: 'hero-location' },
        { wrapperId: 'res-dates-wrapper', triggerId: 'res-date-trigger', checkinId: 'checkin', checkoutId: 'checkout', locationId: 'location' }
    ];

    setups.forEach(setup => {
        const wrapper = document.getElementById(setup.wrapperId);
        if (!wrapper) return;

        const trigger = document.getElementById(setup.triggerId);
        const checkinInput = document.getElementById(setup.checkinId);
        const checkoutInput = document.getElementById(setup.checkoutId);
        const locationInput = document.getElementById(setup.locationId);
        
        // Inject Popup HTML
        const popup = document.createElement('div');
        popup.className = 'calendar-popup glass-panel hidden';
        popup.innerHTML = `
            <div class="flex-between mb-3 align-center">
                <button type="button" class="cal-nav" id="${setup.wrapperId}-prev">&lt;</button>
                <strong class="cal-month-year text-primary" id="${setup.wrapperId}-month"></strong>
                <button type="button" class="cal-nav" id="${setup.wrapperId}-next">&gt;</button>
            </div>
            <div class="grid-7 text-muted text-sm text-center mb-2 font-bold">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div class="grid-7 text-center" id="${setup.wrapperId}-days"></div>
            <div class="cal-warnings mt-3" id="${setup.wrapperId}-warnings"></div>
        `;
        wrapper.appendChild(popup);

        let currentMonth = new Date();
        currentMonth.setDate(1);
        let startDate = checkinInput.value ? new Date(checkinInput.value) : null;
        let endDate = checkoutInput.value ? new Date(checkoutInput.value) : null;

        const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const renderCalendar = () => {
            const daysContainer = document.getElementById(`${setup.wrapperId}-days`);
            const monthLabel = document.getElementById(`${setup.wrapperId}-month`);
            
            daysContainer.innerHTML = '';
            monthLabel.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const firstDayIndex = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            today.setHours(0,0,0,0);

            for (let i = 0; i < firstDayIndex; i++) daysContainer.appendChild(document.createElement('div'));

            for (let i = 1; i <= daysInMonth; i++) {
                const dateObj = new Date(year, month, i);
                const dateStr = formatDateStr(dateObj);
                const dayEl = document.createElement('div');
                dayEl.className = 'cal-day';
                dayEl.textContent = i;

                if (dateObj < today) {
                    dayEl.classList.add('disabled');
                } else {
                    if (startDate && dateStr === formatDateStr(startDate)) dayEl.classList.add('selected');
                    if (endDate && dateStr === formatDateStr(endDate)) dayEl.classList.add('selected');
                    if (startDate && endDate && dateObj > startDate && dateObj < endDate) dayEl.classList.add('in-range');

                    dayEl.addEventListener('click', () => {
                        if (!startDate || (startDate && endDate)) {
                            startDate = dateObj; endDate = null;
                        } else if (dateObj < startDate) {
                            startDate = dateObj; endDate = null;
                        } else {
                            endDate = dateObj;
                        }

                        checkinInput.value = startDate ? formatDateStr(startDate) : '';
                        checkoutInput.value = endDate ? formatDateStr(endDate) : '';
                        
                        renderCalendar();
                        if (setup.wrapperId === 'res-dates-wrapper' && startDate && endDate) performSearch();
                    });
                }
                daysContainer.appendChild(dayEl);
            }
            
            const s = startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Add dates';
            const e = endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            trigger.innerHTML = `<span class="${startDate ? 'text-primary font-bold' : 'text-muted'}">${s}${e ? ' - ' + e : ''}</span>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

            // Real-time Warnings
            const warningsContainer = document.getElementById(`${setup.wrapperId}-warnings`);
            warningsContainer.innerHTML = '';
            if (startDate && endDate) {
                const checkinVal = formatDateStr(startDate);
                const checkoutVal = formatDateStr(endDate);
                const allBookings = getBookings().filter(b => b.status === 'upcoming');
                const conflictingBookings = {};
                
                const locationVal = locationInput ? locationInput.value.toLowerCase().trim() : '';

                // Only show warnings if the user has inputted a location
                if (locationVal) {
                    for (const booking of allBookings) {
                        if (booking.checkin && booking.checkout && checkinVal < booking.checkout && checkoutVal > booking.checkin) {
                            if ((booking.location || '').toLowerCase().includes(locationVal)) {
                                if (!conflictingBookings[booking.property]) conflictingBookings[booking.property] = [];
                                conflictingBookings[booking.property].push(booking);
                            }
                        }
                    }
                }

                if (Object.keys(conflictingBookings).length > 0) {
                    let warningHTML = '<div class="date-warnings-container m-0"><p class="text-gold mb-1" style="font-weight: 600; font-size:0.85rem;">Heads up! Existing bookings on these dates:</p><ul style="margin-top: 0;">';
                    const formatF = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    for (const propName in conflictingBookings) {
                        const ranges = conflictingBookings[propName].map(b => `${formatF(b.checkin)} - ${formatF(b.checkout)}`).join(', ');
                        warningHTML += `<li style="font-size: 0.75rem;"><strong>${propName}:</strong> ${ranges}</li>`;
                    }
                    warningHTML += '</ul></div>';
                    warningsContainer.innerHTML = warningHTML;
                }
            }
        };

        document.getElementById(`${setup.wrapperId}-prev`).addEventListener('click', (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); });
        document.getElementById(`${setup.wrapperId}-next`).addEventListener('click', (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); });
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.calendar-popup, .time-picker-popup, .custom-select-dropdown').forEach(p => { if(p !== popup) p.classList.add('hidden'); });
            popup.classList.toggle('hidden');
            renderCalendar();
        });
        
        // Re-render warnings live if user types in the location field while calendar is open
        if (locationInput) {
            locationInput.addEventListener('input', () => {
                if (!popup.classList.contains('hidden')) renderCalendar();
            });
        }
        
        popup.addEventListener('click', (e) => e.stopPropagation());
    });

    document.addEventListener('click', () => document.querySelectorAll('.calendar-popup, .time-picker-popup, .custom-select-dropdown').forEach(p => p.classList.add('hidden')));
};