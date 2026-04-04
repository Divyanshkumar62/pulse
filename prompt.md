Act as an Expert Frontend Engineer and UI/UX Designer. I am building a Postman alternative called "Pulse". The core layout is there, but I am facing several critical bugs with state management, and the overall UI/UX needs a massive polish.

Current Issues to Fix:

State Management & Reactivity (The "Create Team" Bug): The "Create Team" button and modal are disjointed. When I create a team, the UI does not update in real-time (the Teams counter stays at 0, the empty state doesn't disappear).

Button States: Buttons lack dynamic states (hover, focus, active, disabled, loading). They feel dead when clicked.

Spacing & Alignment (CSS): The padding and margins feel off, particularly in the left sidebar, the request URL bar, and inside the modal. The hierarchy isn't clear.

Overall Aesthetic: The UI looks a bit muddy and lacks contrast. It needs to look professional, modern, and visually striking.

Tasks & Deliverables:

1. Refactor State Management Logic:

Write the logic needed to handle the "Create Team" flow correctly.

Ensure that when the modal form is submitted, the global state updates instantly, closing the modal, updating the "Teams (0)" badge to "Teams (1)", and replacing the "You're not part of any team yet" message with the new team data.

2. UI/UX Overhaul & CSS Fixes:

The Vibe: Redesign the CSS to reflect a premium, futuristic developer tool. Implement a sophisticated "dark liquid glass" aesthetic with deep slate/zinc backgrounds, subtle translucent panels (backdrop-blur), and crisp, high-contrast text.

The Modal: Restyle the "Create New Team" modal. Give it a proper backdrop overlay to focus attention, improve the input field styling (better borders, padding, focus rings), and clearly differentiate the "Cancel" (secondary) and "Create" (primary) buttons.

Spacing Rules: Apply a consistent spacing system. Increase the padding in the left sidebar items to make them more breathable. Align the GET dropdown perfectly with the URL input and the Send button.

Interactive States: Provide CSS classes for every interactive element. Buttons and tabs should have clear hover, active, and disabled visual cues (e.g., slight scaling, color brightening, or glowing accents).

Output Requirements:

Provide the refactored component code for the Sidebar, the Modal, and the relevant State Store/Context.

Provide the exact CSS fix needed to achieve the sleek, dark glass aesthetic.

Explain briefly why the reactivity was failing and how your state management solution fixes it.