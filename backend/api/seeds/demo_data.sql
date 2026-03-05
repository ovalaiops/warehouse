-- Demo seed data for Warehouse Intelligence Platform
-- Run after migrations: psql $DATABASE_URL < seeds/demo_data.sql

-- Organization
INSERT INTO organizations (id, name, plan) VALUES
('11111111-1111-1111-1111-111111111111', 'Acme Logistics', 'enterprise');

-- Users
INSERT INTO users (id, firebase_uid, email, name, role, org_id) VALUES
('22222222-2222-2222-2222-222222222201', 'dev-user-001', 'admin@acmelogistics.com', 'Alex Admin', 'admin', '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222202', 'dev-user-002', 'manager@acmelogistics.com', 'Morgan Manager', 'manager', '11111111-1111-1111-1111-111111111111');

-- Warehouses
INSERT INTO warehouses (id, org_id, name, address, dimensions) VALUES
('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Chicago Distribution Center',
 '1200 Industrial Blvd, Chicago, IL 60609',
 '{"length_ft": 400, "width_ft": 250, "height_ft": 35, "sq_ft": 100000}'),
('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Dallas Fulfillment Hub',
 '8800 Logistics Way, Dallas, TX 75247',
 '{"length_ft": 300, "width_ft": 200, "height_ft": 30, "sq_ft": 60000}');

-- Zones for Chicago
INSERT INTO zones (id, warehouse_id, name, type, bounds, rules) VALUES
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'Receiving Dock A', 'receiving',
 '{"x": 0, "y": 0, "width": 100, "height": 50}', '{"speed_limit_mph": 5, "ppe_required": true}'),
('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', 'Storage Zone B', 'storage',
 '{"x": 100, "y": 0, "width": 200, "height": 250}', '{"speed_limit_mph": 8}'),
('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301', 'Picking Area C', 'picking',
 '{"x": 300, "y": 0, "width": 100, "height": 150}', '{"speed_limit_mph": 5}'),
('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333301', 'Shipping Dock D', 'shipping',
 '{"x": 300, "y": 150, "width": 100, "height": 100}', '{"speed_limit_mph": 5, "ppe_required": true}'),
('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333301', 'Loading Bay E', 'dock',
 '{"x": 0, "y": 50, "width": 100, "height": 50}', '{"speed_limit_mph": 3}');

-- Zones for Dallas
INSERT INTO zones (id, warehouse_id, name, type, bounds, rules) VALUES
('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333302', 'Inbound Receiving', 'receiving',
 '{"x": 0, "y": 0, "width": 80, "height": 40}', '{"ppe_required": true}'),
('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333302', 'Main Storage', 'storage',
 '{"x": 80, "y": 0, "width": 140, "height": 200}', '{"speed_limit_mph": 8}'),
('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333302', 'Outbound Shipping', 'shipping',
 '{"x": 220, "y": 0, "width": 80, "height": 40}', '{"speed_limit_mph": 5}');

-- Cameras for Chicago
INSERT INTO cameras (id, warehouse_id, zone_id, name, feed_url, status) VALUES
('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444401',
 'CAM-CHI-RECV-01', 'rtsp://cameras.internal/chi/recv01', 'active'),
('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402',
 'CAM-CHI-STOR-01', 'rtsp://cameras.internal/chi/stor01', 'active'),
('55555555-5555-5555-5555-555555555503', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402',
 'CAM-CHI-STOR-02', 'rtsp://cameras.internal/chi/stor02', 'active'),
('55555555-5555-5555-5555-555555555504', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444403',
 'CAM-CHI-PICK-01', 'rtsp://cameras.internal/chi/pick01', 'active'),
('55555555-5555-5555-5555-555555555505', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444404',
 'CAM-CHI-SHIP-01', 'rtsp://cameras.internal/chi/ship01', 'active');

-- Cameras for Dallas
INSERT INTO cameras (id, warehouse_id, zone_id, name, feed_url, status) VALUES
('55555555-5555-5555-5555-555555555506', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444406',
 'CAM-DAL-RECV-01', 'rtsp://cameras.internal/dal/recv01', 'active'),
('55555555-5555-5555-5555-555555555507', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444407',
 'CAM-DAL-STOR-01', 'rtsp://cameras.internal/dal/stor01', 'active'),
('55555555-5555-5555-5555-555555555508', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444408',
 'CAM-DAL-SHIP-01', 'rtsp://cameras.internal/dal/ship01', 'offline');

-- Alerts (20 realistic alerts)
INSERT INTO alerts (id, warehouse_id, camera_id, zone_id, type, subtype, severity, status, title, description, reasoning, detections, detected_at) VALUES
-- Safety violations
('66666666-6666-6666-6666-666666666601', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401',
 'safety', 'no_hard_hat', 'high', 'new', 'Missing Hard Hat - Receiving Dock',
 'Worker detected without hard hat in PPE-required zone', 'Hard hat detection model returned confidence 0.94 for person without headgear in receiving dock area.',
 '[{"type":"person","bbox":[120,45,200,380],"confidence":0.96},{"type":"no_hard_hat","bbox":[130,45,180,90],"confidence":0.94}]',
 NOW() - INTERVAL '2 hours'),
('66666666-6666-6666-6666-666666666602', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402',
 'safety', 'no_safety_vest', 'medium', 'acknowledged', 'Missing Safety Vest - Storage Zone',
 'Worker without high-visibility vest detected', 'Safety vest detection confidence 0.89.',
 '[{"type":"person","bbox":[300,100,400,450],"confidence":0.95}]',
 NOW() - INTERVAL '4 hours'),
('66666666-6666-6666-6666-666666666603', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444403',
 'safety', 'blocked_exit', 'critical', 'new', 'Emergency Exit Blocked - Picking Area',
 'Pallets detected blocking emergency exit path', 'Object detection found obstructions within 3ft of emergency exit signage.',
 '[{"type":"pallet","bbox":[50,200,180,350],"confidence":0.97},{"type":"exit_sign","bbox":[90,20,130,50],"confidence":0.99}]',
 NOW() - INTERVAL '30 minutes'),
('66666666-6666-6666-6666-666666666604', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444404',
 'safety', 'spill_detected', 'high', 'new', 'Liquid Spill Detected - Shipping Dock',
 'Possible liquid spill on floor near dock door 3', 'Surface anomaly detection identified wet/reflective area.',
 '[{"type":"spill","bbox":[200,300,350,400],"confidence":0.87}]',
 NOW() - INTERVAL '1 hour'),
('66666666-6666-6666-6666-666666666605', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401',
 'safety', 'pedestrian_vehicle_proximity', 'critical', 'new', 'Near-Miss: Forklift and Pedestrian',
 'Forklift operating within 5ft of pedestrian without spotter', 'Proximity analysis between vehicle and person entities.',
 '[{"type":"forklift","bbox":[100,200,250,400],"confidence":0.98},{"type":"person","bbox":[260,220,310,420],"confidence":0.96}]',
 NOW() - INTERVAL '15 minutes'),

-- Inventory anomalies
('66666666-6666-6666-6666-666666666606', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402',
 'inventory', 'misplaced_item', 'medium', 'new', 'Misplaced Inventory - Aisle B3',
 'Items detected in wrong rack position B3-L2', 'OCR and object detection mismatch with expected inventory database.',
 '[{"type":"box","label":"SKU-4421","expected_position":"B3-L3","actual_position":"B3-L2"}]',
 NOW() - INTERVAL '3 hours'),
('66666666-6666-6666-6666-666666666607', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444402',
 'inventory', 'empty_position', 'low', 'new', 'Unexpected Empty Rack - Aisle C1',
 'Rack position C1-L4 expected to have inventory but appears empty', 'Image analysis shows empty shelf where WMS indicates stock.',
 '[]',
 NOW() - INTERVAL '5 hours'),
('66666666-6666-6666-6666-666666666608', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402',
 'inventory', 'overstocked', 'medium', 'resolved', 'Overstocked Position - Aisle A2',
 'Rack position A2-L1 has items exceeding capacity', 'Weight estimation and item count exceed rack capacity limits.',
 '[{"type":"boxes","count":12,"max_count":8}]',
 NOW() - INTERVAL '8 hours'),
('66666666-6666-6666-6666-666666666609', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444402',
 'inventory', 'damaged_item', 'high', 'new', 'Damaged Package Detected - Aisle D2',
 'Visible damage to packaging at position D2-L3', 'Image quality analysis detected torn packaging and exposed contents.',
 '[{"type":"damaged_box","bbox":[150,180,280,320],"confidence":0.91}]',
 NOW() - INTERVAL '2 hours'),

-- Congestion / operational
('66666666-6666-6666-6666-666666666610', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444403',
 'congestion', 'high_traffic', 'medium', 'new', 'High Traffic - Picking Area',
 '8 workers and 3 forklifts detected in picking area simultaneously', 'Person and vehicle count exceeds zone capacity threshold.',
 '[{"type":"person","count":8},{"type":"forklift","count":3}]',
 NOW() - INTERVAL '1 hour'),
('66666666-6666-6666-6666-666666666611', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401',
 'congestion', 'bottleneck', 'high', 'new', 'Receiving Dock Bottleneck',
 'Receiving dock operating at 95% capacity with 4 trucks queued', 'Dock utilization analysis shows critical congestion.',
 '[{"type":"truck","count":4},{"type":"dock_doors_occupied":3,"dock_doors_total":4}]',
 NOW() - INTERVAL '45 minutes'),

-- Dallas warehouse alerts
('66666666-6666-6666-6666-666666666612', '33333333-3333-3333-3333-333333333302', '55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444406',
 'safety', 'no_hard_hat', 'high', 'new', 'Missing Hard Hat - Inbound Receiving',
 'Worker without hard hat in PPE zone', 'Hard hat detection confidence 0.92.',
 '[{"type":"person","bbox":[80,60,160,350],"confidence":0.95}]',
 NOW() - INTERVAL '1 hour'),
('66666666-6666-6666-6666-666666666613', '33333333-3333-3333-3333-333333333302', '55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444407',
 'safety', 'forklift_speeding', 'high', 'acknowledged', 'Forklift Speeding - Main Storage',
 'Forklift FL-03 exceeding 8 mph speed limit in storage zone', 'Speed estimation from trajectory analysis: 12.3 mph.',
 '[{"type":"forklift","id":"FL-03","speed_mph":12.3,"limit_mph":8}]',
 NOW() - INTERVAL '3 hours'),
('66666666-6666-6666-6666-666666666614', '33333333-3333-3333-3333-333333333302', '55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444407',
 'inventory', 'count_mismatch', 'medium', 'new', 'Inventory Count Mismatch - Section G',
 'Visual count shows 45 pallets, WMS reports 52', 'Automated counting vs. WMS comparison.',
 '[{"visual_count":45,"wms_count":52,"variance":-7}]',
 NOW() - INTERVAL '6 hours'),
('66666666-6666-6666-6666-666666666615', '33333333-3333-3333-3333-333333333302', '55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444406',
 'safety', 'unauthorized_area', 'medium', 'new', 'Unauthorized Access - Restricted Area',
 'Person detected in restricted maintenance area without clearance badge', 'Person detection in geofenced restricted zone.',
 '[{"type":"person","bbox":[200,150,280,400],"confidence":0.93}]',
 NOW() - INTERVAL '2 hours'),
('66666666-6666-6666-6666-666666666616', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402',
 'safety', 'improper_stacking', 'medium', 'new', 'Improper Pallet Stacking - Storage B',
 'Pallets stacked beyond safe height limit', 'Height estimation shows 6 pallets high, limit is 4.',
 '[{"type":"pallet_stack","height":6,"max_height":4}]',
 NOW() - INTERVAL '4 hours'),
('66666666-6666-6666-6666-666666666617', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444404',
 'congestion', 'dock_idle', 'low', 'resolved', 'Idle Dock Door - Shipping',
 'Dock door 2 has been idle for over 45 minutes during peak hours', 'Activity monitoring detected no movement.',
 '[]',
 NOW() - INTERVAL '10 hours'),
('66666666-6666-6666-6666-666666666618', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444403',
 'safety', 'ergonomic_risk', 'medium', 'new', 'Ergonomic Risk - Heavy Lifting',
 'Worker performing manual lift of oversized package without assistance', 'Pose estimation detected improper lifting posture with heavy load.',
 '[{"type":"person","pose":"bending","load_estimate_lbs":60}]',
 NOW() - INTERVAL '90 minutes'),
('66666666-6666-6666-6666-666666666619', '33333333-3333-3333-3333-333333333302', '55555555-5555-5555-5555-555555555508', '44444444-4444-4444-4444-444444444408',
 'congestion', 'delayed_shipment', 'high', 'new', 'Delayed Shipment Assembly',
 'Order #ORD-7823 shipment assembly behind schedule by 2 hours', 'Activity tracking shows incomplete pallet assembly for outbound shipment.',
 '[{"order_id":"ORD-7823","delay_hours":2}]',
 NOW() - INTERVAL '30 minutes'),
('66666666-6666-6666-6666-666666666620', '33333333-3333-3333-3333-333333333301', '55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444402',
 'inventory', 'temperature_anomaly', 'critical', 'new', 'Temperature Anomaly - Cold Storage Section',
 'Thermal camera detected temperature above threshold in cold storage', 'Thermal analysis shows 45F in zone requiring 35F.',
 '[{"measured_temp_f":45,"required_temp_f":35,"zone":"cold_storage_A"}]',
 NOW() - INTERVAL '20 minutes');

-- Fleet Vehicles
INSERT INTO fleet_vehicles (id, warehouse_id, type, identifier, status) VALUES
('77777777-7777-7777-7777-777777777701', '33333333-3333-3333-3333-333333333301', 'forklift', 'FL-01', 'active'),
('77777777-7777-7777-7777-777777777702', '33333333-3333-3333-3333-333333333301', 'forklift', 'FL-02', 'active'),
('77777777-7777-7777-7777-777777777703', '33333333-3333-3333-3333-333333333301', 'forklift', 'FL-03', 'idle'),
('77777777-7777-7777-7777-777777777704', '33333333-3333-3333-3333-333333333301', 'pallet_jack', 'PJ-01', 'active'),
('77777777-7777-7777-7777-777777777705', '33333333-3333-3333-3333-333333333301', 'agv', 'AGV-01', 'active');

-- Vehicle Trajectories
INSERT INTO vehicle_trajectories (vehicle_id, camera_id, path, speed_avg, speed_max, recorded_at) VALUES
('77777777-7777-7777-7777-777777777701', '55555555-5555-5555-5555-555555555502',
 '[{"x":50,"y":100,"t":0},{"x":100,"y":100,"t":5},{"x":150,"y":120,"t":10},{"x":200,"y":120,"t":15}]',
 6.5, 8.2, NOW() - INTERVAL '1 hour'),
('77777777-7777-7777-7777-777777777702', '55555555-5555-5555-5555-555555555504',
 '[{"x":300,"y":50,"t":0},{"x":280,"y":80,"t":4},{"x":250,"y":100,"t":8},{"x":220,"y":130,"t":12}]',
 7.1, 9.0, NOW() - INTERVAL '30 minutes'),
('77777777-7777-7777-7777-777777777705', '55555555-5555-5555-5555-555555555503',
 '[{"x":150,"y":200,"t":0},{"x":160,"y":180,"t":3},{"x":170,"y":160,"t":6},{"x":180,"y":140,"t":9}]',
 4.0, 4.5, NOW() - INTERVAL '2 hours');

-- Rack Positions
INSERT INTO rack_positions (id, warehouse_id, zone_id, aisle, bay, level, position_code, max_weight_lbs) VALUES
('88888888-8888-8888-8888-888888888801', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', 'A', '1', '1', 'A1-L1', 2000),
('88888888-8888-8888-8888-888888888802', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', 'A', '1', '2', 'A1-L2', 1800),
('88888888-8888-8888-8888-888888888803', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', 'A', '2', '1', 'A2-L1', 2000),
('88888888-8888-8888-8888-888888888804', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', 'B', '3', '2', 'B3-L2', 1500),
('88888888-8888-8888-8888-888888888805', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', 'C', '1', '4', 'C1-L4', 1200);

-- Inventory Snapshots
INSERT INTO inventory_snapshots (rack_position_id, camera_id, status, detected_items, expected_items, confidence) VALUES
('88888888-8888-8888-8888-888888888801', '55555555-5555-5555-5555-555555555502', 'match',
 '{"items":[{"sku":"SKU-1001","qty":24}]}', '{"items":[{"sku":"SKU-1001","qty":24}]}', 0.95),
('88888888-8888-8888-8888-888888888802', '55555555-5555-5555-5555-555555555502', 'match',
 '{"items":[{"sku":"SKU-2003","qty":12}]}', '{"items":[{"sku":"SKU-2003","qty":12}]}', 0.92),
('88888888-8888-8888-8888-888888888803', '55555555-5555-5555-5555-555555555502', 'mismatch',
 '{"items":[{"sku":"SKU-3005","qty":8}]}', '{"items":[{"sku":"SKU-3005","qty":15}]}', 0.88),
('88888888-8888-8888-8888-888888888804', '55555555-5555-5555-5555-555555555503', 'anomaly',
 '{"items":[{"sku":"SKU-4421","qty":6}]}', '{"items":[{"sku":"SKU-4400","qty":10}]}', 0.85),
('88888888-8888-8888-8888-888888888805', '55555555-5555-5555-5555-555555555503', 'empty',
 '{"items":[]}', '{"items":[{"sku":"SKU-5500","qty":20}]}', 0.97);

-- Products (Consumer)
INSERT INTO products (id, upc, name, brand, category, description, image_url, nutrition, allergens, certifications) VALUES
('99999999-9999-9999-9999-999999999901', '012345678901', 'Organic Whole Milk', 'Happy Valley', 'Dairy',
 'Farm-fresh organic whole milk, 1 gallon', 'https://images.example.com/milk.jpg',
 '{"calories":150,"fat_g":8,"protein_g":8,"carbs_g":12,"serving_size":"1 cup"}',
 ARRAY['milk'], ARRAY['USDA Organic', 'Non-GMO']),
('99999999-9999-9999-9999-999999999902', '012345678902', 'Sourdough Bread', 'Artisan Bakers', 'Bakery',
 'Traditional sourdough bread loaf', 'https://images.example.com/bread.jpg',
 '{"calories":120,"fat_g":1,"protein_g":4,"carbs_g":24,"serving_size":"1 slice"}',
 ARRAY['wheat', 'gluten'], ARRAY[]::TEXT[]),
('99999999-9999-9999-9999-999999999903', '012345678903', 'Free Range Eggs', 'Sunny Farm', 'Dairy',
 'Free range large eggs, 12 count', 'https://images.example.com/eggs.jpg',
 '{"calories":70,"fat_g":5,"protein_g":6,"carbs_g":0,"serving_size":"1 egg"}',
 ARRAY['eggs'], ARRAY['Free Range', 'Non-GMO']),
('99999999-9999-9999-9999-999999999904', '012345678904', 'Extra Virgin Olive Oil', 'Mediterranean Gold', 'Oils',
 'Cold-pressed extra virgin olive oil, 500ml', 'https://images.example.com/oliveoil.jpg',
 '{"calories":120,"fat_g":14,"protein_g":0,"carbs_g":0,"serving_size":"1 tbsp"}',
 ARRAY[]::TEXT[], ARRAY['USDA Organic']),
('99999999-9999-9999-9999-999999999905', '012345678905', 'Greek Yogurt Plain', 'Olympus', 'Dairy',
 'Traditional Greek yogurt, plain, 32oz', 'https://images.example.com/yogurt.jpg',
 '{"calories":100,"fat_g":0,"protein_g":17,"carbs_g":6,"serving_size":"3/4 cup"}',
 ARRAY['milk'], ARRAY['Non-GMO']),
('99999999-9999-9999-9999-999999999906', '012345678906', 'Organic Baby Spinach', 'Green Fields', 'Produce',
 'Pre-washed organic baby spinach, 5oz', 'https://images.example.com/spinach.jpg',
 '{"calories":20,"fat_g":0,"protein_g":2,"carbs_g":3,"serving_size":"3 cups"}',
 ARRAY[]::TEXT[], ARRAY['USDA Organic']),
('99999999-9999-9999-9999-999999999907', '012345678907', 'Atlantic Salmon Fillet', 'Ocean Fresh', 'Seafood',
 'Wild-caught Atlantic salmon fillet, 8oz', 'https://images.example.com/salmon.jpg',
 '{"calories":180,"fat_g":8,"protein_g":25,"carbs_g":0,"serving_size":"4 oz"}',
 ARRAY['fish'], ARRAY['MSC Certified']),
('99999999-9999-9999-9999-999999999908', '012345678908', 'Dark Chocolate Bar', 'Cocoa Craft', 'Snacks',
 '72% dark chocolate bar, 3.5oz', 'https://images.example.com/chocolate.jpg',
 '{"calories":170,"fat_g":12,"protein_g":2,"carbs_g":17,"serving_size":"3 pieces"}',
 ARRAY['milk', 'soy'], ARRAY['Fair Trade']),
('99999999-9999-9999-9999-999999999909', '012345678909', 'Almond Butter', 'Nutty Delights', 'Spreads',
 'Creamy almond butter, no added sugar, 16oz', 'https://images.example.com/almondbutter.jpg',
 '{"calories":190,"fat_g":17,"protein_g":7,"carbs_g":6,"serving_size":"2 tbsp"}',
 ARRAY['tree nuts'], ARRAY['Non-GMO', 'Gluten Free']),
('99999999-9999-9999-9999-999999999910', '012345678910', 'Sparkling Water Lime', 'BubbleFresh', 'Beverages',
 'Natural lime sparkling water, 12-pack', 'https://images.example.com/sparkling.jpg',
 '{"calories":0,"fat_g":0,"protein_g":0,"carbs_g":0,"serving_size":"12 fl oz"}',
 ARRAY[]::TEXT[], ARRAY[]::TEXT[]);

-- Product Prices
INSERT INTO product_prices (product_id, retailer, price, currency, unit_price, unit) VALUES
('99999999-9999-9999-9999-999999999901', 'Whole Foods', 6.99, 'USD', 0.055, 'fl oz'),
('99999999-9999-9999-9999-999999999901', 'Kroger', 5.49, 'USD', 0.043, 'fl oz'),
('99999999-9999-9999-9999-999999999901', 'Walmart', 4.98, 'USD', 0.039, 'fl oz'),
('99999999-9999-9999-9999-999999999902', 'Whole Foods', 5.99, 'USD', NULL, NULL),
('99999999-9999-9999-9999-999999999902', 'Trader Joes', 3.99, 'USD', NULL, NULL),
('99999999-9999-9999-9999-999999999903', 'Whole Foods', 5.99, 'USD', 0.50, 'egg'),
('99999999-9999-9999-9999-999999999903', 'Costco', 4.49, 'USD', 0.37, 'egg'),
('99999999-9999-9999-9999-999999999904', 'Whole Foods', 12.99, 'USD', 0.77, 'fl oz'),
('99999999-9999-9999-9999-999999999905', 'Kroger', 5.99, 'USD', 0.19, 'oz'),
('99999999-9999-9999-9999-999999999906', 'Trader Joes', 2.49, 'USD', 0.50, 'oz'),
('99999999-9999-9999-9999-999999999907', 'Whole Foods', 11.99, 'USD', 1.50, 'oz'),
('99999999-9999-9999-9999-999999999908', 'Target', 3.99, 'USD', 1.14, 'oz'),
('99999999-9999-9999-9999-999999999909', 'Whole Foods', 9.99, 'USD', 0.62, 'oz'),
('99999999-9999-9999-9999-999999999910', 'Costco', 4.99, 'USD', 0.035, 'fl oz');

-- Shift Reports
INSERT INTO shift_reports (warehouse_id, shift_start, shift_end, summary, metrics) VALUES
('33333333-3333-3333-3333-333333333301',
 NOW() - INTERVAL '16 hours', NOW() - INTERVAL '8 hours',
 'Morning shift completed. 3 safety incidents reported, 2 resolved. Receiving dock operated at high capacity. Forklift FL-01 logged 42 trips.',
 '{"safety_incidents":3,"resolved":2,"forklift_trips":{"FL-01":42,"FL-02":38,"FL-03":15},"dock_utilization":0.87,"picks_completed":1240}'),
('33333333-3333-3333-3333-333333333301',
 NOW() - INTERVAL '8 hours', NOW(),
 'Afternoon shift in progress. 2 critical safety alerts pending. Inventory scan completed for aisles A-C.',
 '{"safety_incidents":2,"resolved":0,"forklift_trips":{"FL-01":28,"FL-02":31},"dock_utilization":0.72,"picks_completed":890}');
