USE paysafe;
INSERT INTO regions (id,name) VALUES ('REG-A','Northern Region'),('REG-B','Central Region'),('REG-C','Southern Region');
INSERT INTO branches (id,region_id,name) VALUES ('BR-A1','REG-A','Hyderabad Central'),('BR-A2','REG-A','Secunderabad'),('BR-B1','REG-B','Bengaluru Main'),('BR-B2','REG-B','Mysuru City'),('BR-C1','REG-C','Chennai Marina'),('BR-C2','REG-C','Vellore Campus');
-- Create demo users through a separate development-only seed script after hashing passwords with Argon2id/bcrypt.
-- Runtime demo credentials are defined in backend/src/server.js and must never be reused in production.
