-- Seed Data for ShelfShare
-- Usage: psql -d shelfshare -f seeds.sql

-- Clear existing data (optional, be careful in production!)
-- TRUNCATE users, books, loans, reviews, favorites, newsletter_subscribers RESTART IDENTITY CASCADE;

-- 1. Insert Users (Password is '123456' for all users)
INSERT INTO users (username, email, password, role, first_name, last_name, mobile, gender, address) VALUES
('admin', 'admin@shelfshare.com', '$2b$10$xGStjG9/FEQrVUL8r/fDHuV8mLFmv9FcLB.dMG91GrgORS.eqtTsm', 'admin', 'Admin', 'User', '0812345678', 'Other', 'ShelfShare HQ'),
('somchai', 'somchai@example.com', '$2b$10$xGStjG9/FEQrVUL8r/fDHuV8mLFmv9FcLB.dMG91GrgORS.eqtTsm', 'user', 'Somchai', 'Jaidee', '0899999999', 'Male', '123 Bangkok Road'),
('suda', 'suda@example.com', '$2b$10$xGStjG9/FEQrVUL8r/fDHuV8mLFmv9FcLB.dMG91GrgORS.eqtTsm', 'user', 'Suda', 'Rakrian', '0877777777', 'Female', '456 Chiang Mai Lane');

-- 2. Insert Books (Using Category IDs from schema.sql default inserts)
-- IDS: 1=Fiction, 2=Non-Fiction, 3=Science, 4=Tech, 5=History, 6=Bio, 7=Self-Help, 8=Business, 9=Art, 10=Health, 11=Travel

INSERT INTO books (title, author, isbn, published_year, category_id, description, cover_image, owner_id, status) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 1925, 1, 'The story of the mysteriously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800', 1, 'available'),
('Clean Code', 'Robert C. Martin', '9780132350884', 2008, 4, 'A Handbook of Agile Software Craftsmanship.', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800', 1, 'available'),
('Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', '9780062316097', 2011, 5, 'The history of humankind from the evolution of archaic human species in the Stone Age up to the twenty-first century.', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800', 2, 'borrowed'),
('Atomic Habits', 'James Clear', '9780735211292', 2018, 7, 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800', 2, 'available'),
('Steve Jobs', 'Walter Isaacson', '9781451648539', 2011, 6, 'The exclusive biography of Steve Jobs.', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800', 3, 'available'),
('Thinking, Fast and Slow', 'Daniel Kahneman', '9780374275631', 2011, 3, 'The two systems that drive the way we think.', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800', 1, 'maintenance');

-- 3. Insert Loans (History of borrowing)
INSERT INTO loans (book_id, user_id, loan_date, due_date, return_date, status) VALUES
(1, 2, NOW() - INTERVAL '30 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '25 days', 'returned'), -- Somchai borrowed Gatsby and returned
(3, 3, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', NULL, 'active'); -- Suda currently borrowing Sapiens

-- 4. Insert Reviews
INSERT INTO reviews (book_id, user_id, rating, comment, created_at) VALUES
(1, 2, 5, 'Classic book! Loved it.', NOW() - INTERVAL '24 days'),
(3, 2, 4, 'Very insightful but a bit long.', NOW() - INTERVAL '10 days');

-- 5. Insert Favorites
INSERT INTO favorites (user_id, book_id) VALUES
(2, 2), -- Somchai likes Clean Code
(2, 4), -- Somchai likes Atomic Habits
(3, 1); -- Suda likes Gatsby

-- 6. Insert Newsletter Subscribers
INSERT INTO newsletter_subscribers (email) VALUES
('somchai@example.com'),
('interested_user@test.com');
