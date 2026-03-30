const INVENTORY = [
  { id:1,  name:"00 Flour",              category:"Dry Goods",   unit:"lbs",   currentStock:45,  minStock:50,  maxStock:200, unitCost:1.20,  supplier:"Sam's Club" },
  { id:2,  name:"Semolina Flour",        category:"Dry Goods",   unit:"lbs",   currentStock:30,  minStock:25,  maxStock:100, unitCost:1.50,  supplier:"Sam's Club" },
  { id:3,  name:"Sea Salt",              category:"Dry Goods",   unit:"lbs",   currentStock:15,  minStock:10,  maxStock:50,  unitCost:2.00,  supplier:"Sam's Club" },
  { id:4,  name:"Extra Virgin Olive Oil",category:"Dry Goods",   unit:"liters",currentStock:8,   minStock:10,  maxStock:40,  unitCost:18.00, supplier:"Sam's Club" },
  { id:5,  name:"Fresh Mozzarella",      category:"Dairy",       unit:"lbs",   currentStock:12,  minStock:15,  maxStock:50,  unitCost:8.50,  supplier:"US Foods" },
  { id:6,  name:"Parmigiano-Reggiano",   category:"Dairy",       unit:"lbs",   currentStock:20,  minStock:10,  maxStock:40,  unitCost:22.00, supplier:"US Foods" },
  { id:7,  name:"Ricotta",               category:"Dairy",       unit:"lbs",   currentStock:6,   minStock:8,   maxStock:30,  unitCost:5.00,  supplier:"US Foods" },
  { id:8,  name:"Burrata",               category:"Dairy",       unit:"units", currentStock:10,  minStock:12,  maxStock:36,  unitCost:6.00,  supplier:"US Foods" },
  { id:9,  name:"Prosciutto di Parma",   category:"Proteins",    unit:"lbs",   currentStock:8,   minStock:6,   maxStock:20,  unitCost:28.00, supplier:"US Foods" },
  { id:10, name:"Italian Sausage",       category:"Proteins",    unit:"lbs",   currentStock:15,  minStock:10,  maxStock:40,  unitCost:9.00,  supplier:"Sam's Club" },
  { id:11, name:"Pancetta",              category:"Proteins",    unit:"lbs",   currentStock:5,   minStock:6,   maxStock:20,  unitCost:16.00, supplier:"US Foods" },
  { id:12, name:"Anchovies",             category:"Proteins",    unit:"cans",  currentStock:24,  minStock:12,  maxStock:48,  unitCost:4.50,  supplier:"US Foods" },
  { id:13, name:"San Marzano Tomatoes",  category:"Produce",     unit:"cans",  currentStock:48,  minStock:24,  maxStock:96,  unitCost:3.50,  supplier:"US Foods" },
  { id:14, name:"Fresh Basil",           category:"Produce",     unit:"oz",    currentStock:16,  minStock:20,  maxStock:60,  unitCost:0.75,  supplier:"US Foods" },
  { id:15, name:"Garlic",                category:"Produce",     unit:"lbs",   currentStock:10,  minStock:8,   maxStock:30,  unitCost:3.00,  supplier:"US Foods" },
  { id:16, name:"Baby Arugula",          category:"Produce",     unit:"lbs",   currentStock:4,   minStock:5,   maxStock:20,  unitCost:6.50,  supplier:"US Foods" },
  { id:17, name:"Oak Logs",              category:"Wood & Fuel", unit:"cords", currentStock:2.5, minStock:1,   maxStock:5,   unitCost:350.00,supplier:"Sam's Club" },
  { id:18, name:"Cherry Wood Chips",     category:"Wood & Fuel", unit:"bags",  currentStock:15,  minStock:10,  maxStock:40,  unitCost:18.00, supplier:"Sam's Club" },
  { id:19, name:'Pizza Boxes (12")',     category:"Packaging",   unit:"units", currentStock:200, minStock:150, maxStock:600, unitCost:0.85,  supplier:"Sam's Club" },
  { id:20, name:"To-Go Containers",      category:"Packaging",   unit:"units", currentStock:100, minStock:200, maxStock:500, unitCost:0.45,  supplier:"Sam's Club" },
];

const RECIPES = [
  { id:1, name:"Margherita",           price:16, icon:"🍕", ingredients:[{id:1,qty:0.40},{id:5,qty:0.20},{id:13,qty:0.19},{id:14,qty:0.50},{id:4,qty:0.02}] },
  { id:2, name:"Italian Sausage",      price:18, icon:"🍕", ingredients:[{id:1,qty:0.40},{id:5,qty:0.20},{id:13,qty:0.19},{id:10,qty:0.13},{id:4,qty:0.02}] },
  { id:3, name:"Prosciutto & Arugula", price:22, icon:"🍕", ingredients:[{id:1,qty:0.40},{id:5,qty:0.15},{id:9,qty:0.06},{id:16,qty:0.06},{id:6,qty:0.03},{id:4,qty:0.02}] },
  { id:4, name:"White Truffle",        price:20, icon:"🍕", ingredients:[{id:1,qty:0.40},{id:7,qty:0.13},{id:5,qty:0.10},{id:15,qty:0.03},{id:4,qty:0.03}] },
  { id:5, name:"Burrata Garden",       price:21, icon:"🍕", ingredients:[{id:1,qty:0.40},{id:8,qty:0.50},{id:13,qty:0.19},{id:14,qty:0.50},{id:4,qty:0.02}] },
  { id:6, name:"Pancetta Funghi",      price:19, icon:"🍕", ingredients:[{id:1,qty:0.40},{id:5,qty:0.20},{id:13,qty:0.19},{id:11,qty:0.08},{id:4,qty:0.02}] },
];

const TODAY_SALES = [
  { recipeId:1, qty:18 },
  { recipeId:2, qty:14 },
  { recipeId:3, qty:9  },
  { recipeId:4, qty:7  },
  { recipeId:5, qty:6  },
  { recipeId:6, qty:5  },
];

const ORDERS = [
  { id:"PO-2026-042", supplier:"US Foods",   items:["Fresh Mozzarella","Ricotta","Burrata","Prosciutto di Parma"],                    total:612.00, status:"Delivered",  orderDate:"2026-03-20", deliveryDate:"2026-03-22", lineItems:[{id:5,qty:20},{id:7,qty:15},{id:8,qty:24},{id:9,qty:10}] },
  { id:"PO-2026-041", supplier:"US Foods",   items:["Pancetta","Italian Sausage","San Marzano Tomatoes","Baby Arugula"],              total:348.50, status:"In Transit", orderDate:"2026-03-25", deliveryDate:"2026-03-30", lineItems:[{id:11,qty:10},{id:10,qty:20},{id:13,qty:48},{id:16,qty:10}] },
  { id:"PO-2026-040", supplier:"Sam's Club", items:['00 Flour','Semolina Flour','EVOO','Pizza Boxes (12")'],                          total:285.00, status:"Pending",    orderDate:"2026-03-27", deliveryDate:"2026-04-01", lineItems:[{id:1,qty:100},{id:2,qty:50},{id:4,qty:12},{id:19,qty:200}] },
  { id:"PO-2026-039", supplier:"US Foods",   items:["Fresh Mozzarella","Parmigiano-Reggiano","Fresh Basil","Garlic"],                 total:294.00, status:"Delivered",  orderDate:"2026-03-15", deliveryDate:"2026-03-17", lineItems:[{id:5,qty:20},{id:6,qty:10},{id:14,qty:40},{id:15,qty:15}] },
  { id:"PO-2026-038", supplier:"Sam's Club", items:["00 Flour","Sea Salt","Oak Logs","To-Go Containers"],                             total:512.00, status:"Delivered",  orderDate:"2026-03-10", deliveryDate:"2026-03-12", lineItems:[{id:1,qty:150},{id:3,qty:25},{id:17,qty:2},{id:20,qty:300}] },
];

const STAFF = [
  {id:1, name:"Marco Ricci",   role:"Head Pizza Chef", rate:22, phone:"(312) 555-0101", status:"active"},
  {id:2, name:"Sofia Delgado", role:"Sous Chef",        rate:18, phone:"(312) 555-0102", status:"active"},
  {id:3, name:"James Park",    role:"Line Cook",        rate:15, phone:"(312) 555-0103", status:"active"},
  {id:4, name:"Ava Thornton",  role:"Server",           rate:12, phone:"(312) 555-0104", status:"active"},
  {id:5, name:"Luca Ferrante", role:"Server",           rate:12, phone:"(312) 555-0105", status:"active"},
  {id:6, name:"Nina Okafor",   role:"Host / Cashier",  rate:13, phone:"(312) 555-0106", status:"off"},
  {id:7, name:"Derek Walsh",   role:"Dishwasher",       rate:13, phone:"(312) 555-0107", status:"active"},
];

const TODAY_SHIFTS = [
  {staffId:1, start:"2:00 PM", end:"10:00 PM", hours:8},
  {staffId:2, start:"3:00 PM", end:"10:00 PM", hours:7},
  {staffId:3, start:"3:00 PM", end:"10:00 PM", hours:7},
  {staffId:4, start:"4:00 PM", end:"10:00 PM", hours:6},
  {staffId:5, start:"4:00 PM", end:"10:00 PM", hours:6},
  {staffId:7, start:"4:00 PM", end:"10:00 PM", hours:6},
];

module.exports = { INVENTORY, RECIPES, TODAY_SALES, ORDERS, STAFF, TODAY_SHIFTS };
