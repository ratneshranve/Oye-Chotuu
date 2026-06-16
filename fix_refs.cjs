const { execSync } = require('child_process');
const fs = require('fs');

// Regenerate from OrdersMain.jsx
execSync('node extract.cjs', { cwd: 'Frontend' });

let code = fs.readFileSync('Frontend/src/modules/Food/components/restaurant/GlobalNewOrderPopup.jsx', 'utf8');

// 1. Remove duplicate requestOrdersRefresh
const toReplace = '  const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);\r\n  const requestOrdersRefresh = () => setOrdersRefreshToken((t) => t + 1);\r\n';
const toReplaceLF = '  const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);\n  const requestOrdersRefresh = () => setOrdersRefreshToken((t) => t + 1);\n';

if (code.includes(toReplace)) {
    code = code.replace(toReplace, '');
} else if (code.includes(toReplaceLF)) {
    code = code.replace(toReplaceLF, '');
} else {
    // try line by line split
    let lines = code.split('\n');
    lines = lines.filter(line => !line.includes('const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);') && !line.includes('const requestOrdersRefresh = () => setOrdersRefreshToken((t) => t + 1);'));
    code = lines.join('\n');
}

// 2. Add the missing refs just after acceptSwipeActiveRef
const missingRefs = `
  const showNewOrderPopupRef = useRef(false);
  const isMutedRef = useRef(false);
  const newOrderRef = useRef(null);
  const audioUnlockedRef = useRef(false);
`;

code = code.replace('const acceptSwipeActiveRef = useRef(false);', 'const acceptSwipeActiveRef = useRef(false);\n' + missingRefs);

fs.writeFileSync('Frontend/src/modules/Food/components/restaurant/GlobalNewOrderPopup.jsx', code);
console.log('Fixed file perfectly!');
