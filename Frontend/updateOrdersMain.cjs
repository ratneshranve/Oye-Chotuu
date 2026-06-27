const fs = require('fs');
const file = 'c:/Users/Abcom/Desktop/AppzetoProjects/OyeChotuu/Frontend/src/modules/Food/pages/restaurant/OrdersMain.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /([ \t]+)deliveryPartnerId: order\.deliveryPartnerId \|\| null,\n([ \t]+)deliveryPartnerName:.*,\n([ \t]+)deliveryPartnerPhone:.*,/g;

const replacement = `$1deliveryPartnerId: order.deliveryPartner?._id || order.deliveryPartner?.id || (typeof order.deliveryPartnerId === 'object' ? order.deliveryPartnerId?._id : order.deliveryPartnerId) || (typeof order.dispatch?.deliveryPartnerId === 'object' ? order.dispatch?.deliveryPartnerId?._id : order.dispatch?.deliveryPartnerId) || (typeof order.assignmentInfo?.deliveryPartnerId === 'object' ? order.assignmentInfo?.deliveryPartnerId?._id : order.assignmentInfo?.deliveryPartnerId) || null,\n$2deliveryPartnerName: order.deliveryPartner?.name || order.deliveryPartnerId?.name || order.dispatch?.deliveryPartnerId?.name || order.assignmentInfo?.deliveryPartnerId?.name || null,\n$3deliveryPartnerPhone: order.deliveryPartner?.phone || order.deliveryPartnerId?.phone || order.dispatch?.deliveryPartnerId?.phone || order.assignmentInfo?.deliveryPartnerId?.phone || null,`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log('Replaced successfully.');
