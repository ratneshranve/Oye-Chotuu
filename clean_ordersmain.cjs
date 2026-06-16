const fs = require('fs');
const lines = fs.readFileSync('Frontend/src/modules/Food/pages/restaurant/OrdersMain.jsx', 'utf8').split('\n');

const regionsToRemove = [
    { start: '  // New order popup states', end: '  const [restaurantStatus, setRestaurantStatus] = useState({' },
    { start: '  const audioUnlockedRef = useRef(false);', end: '  // Fetch restaurant verification status' },
    { start: '  // Timer persistence helpers', end: '  // Fetch restaurant verification status' }, // In case this matches first
    { start: '  // Show new order popup when real order notification arrives from Socket.IO', end: '  // Handle cancel order (for preparing orders)' },
    { start: '  // Toggle mute', end: '  // Handle swipe gestures with smooth animations' },
    { start: '  const currentPopupOrder = popupOrder || newOrder;', end: '  return (' },
    { start: '      <audio', end: '      {/* Cancel Order Popup */}' }
];

let newLines = [];
let skip = false;
let currentEnd = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!skip) {
        const matchingRegion = regionsToRemove.find(r => line.includes(r.start));
        if (matchingRegion) {
            skip = true;
            currentEnd = matchingRegion.end;

            if (matchingRegion.start === '  // New order popup states') {
                newLines.push('  const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);');
                newLines.push('  const requestOrdersRefresh = () => setOrdersRefreshToken((prev) => prev + 1);');
            }

            if (matchingRegion.start === '  // Show new order popup when real order notification arrives from Socket.IO') {
                newLines.push('  // Listen for global orders refresh event');
                newLines.push('  useEffect(() => {');
                newLines.push('    const handleRefresh = () => requestOrdersRefresh();');
                newLines.push('    window.addEventListener(\'ordersRefresh\', handleRefresh);');
                newLines.push('    return () => window.removeEventListener(\'ordersRefresh\', handleRefresh);');
                newLines.push('  }, []);');
                newLines.push('');
            }
            continue;
        }
        newLines.push(line);
    } else {
        if (line.includes(currentEnd)) {
            skip = false;
            // The end line is INCLUDED for everything EXCEPT when we need to push it
            if (currentEnd === '  const [restaurantStatus, setRestaurantStatus] = useState({') {
                newLines.push(line);
            }
            if (currentEnd === '  // Fetch restaurant verification status') {
                newLines.push(line);
            }
            if (currentEnd === '  // Handle cancel order (for preparing orders)') {
                newLines.push(line);
            }
            if (currentEnd === '  // Handle swipe gestures with smooth animations') {
                newLines.push(line);
            }
            if (currentEnd === '  return (') {
                newLines.push(line);
            }
            if (currentEnd === '      {/* Cancel Order Popup */}') {
                newLines.push(line);
            }
            currentEnd = null;
        }
    }
}

fs.writeFileSync('Frontend/src/modules/Food/pages/restaurant/OrdersMain.jsx', newLines.join('\n'));
console.log('Cleaned OrdersMain completely!');
