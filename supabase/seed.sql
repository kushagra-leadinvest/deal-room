-- Dummy data for testing. Every company, person and number here is made up.
-- Run AFTER creating your two users in Supabase Auth (seed uses the first two profiles).
-- Re-running adds duplicates of nothing: it stops if the dummy companies already exist.

do $$
declare
  a uuid;  -- first user
  b uuid;  -- second user (falls back to the first)
  c uuid;
  d uuid;
  t uuid;
begin
  select id into a from profiles order by created_at limit 1;
  select id into b from profiles order by created_at offset 1 limit 1;
  if a is null then
    raise exception 'Create at least one user in Supabase Auth before seeding';
  end if;
  b := coalesce(b, a);

  if exists (select 1 from companies where domain = 'voltleaf.example') then
    raise notice 'Seed data already present, skipping';
    return;
  end if;

  -- 1. Voltleaf: battery, in research, healthy
  insert into companies (name, website, one_liner, stage, location, last_round_stage, last_round_size, last_round_date,
                         existing_investors, ai_summary, revenue_metrics, traction_metrics, raise_ask, thesis_notes, created_by)
  values ('Voltleaf Energy', 'https://voltleaf.example', 'LFP cell packs for two-wheeler fleets', 'Seed', 'Pune',
          'Seed', 45000000, current_date - 300, '{"Alpha Seed Fund","Angel Syndicate X"}',
          'Builds swappable LFP battery packs for last-mile delivery two-wheelers and leases them to fleet operators.',
          'ARR ₹6Cr, 40% QoQ', '3,200 packs deployed across 4 cities', '₹30Cr Series A',
          'Fleet electrification is the wedge; watch cell cost exposure.', a)
  returning id into c;
  perform add_sector_path(c, 'Energy > Battery > LFP');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Series A', 300000000, 'research', a, 'Call two fleet customers for references', current_date + 3, a);
  insert into people (name, email, created_by) values ('Asha Rao (dummy)', 'asha@voltleaf.example', a) returning id into t;
  insert into company_people (company_id, person_id, role, created_by) values (c, t, 'founder', a);
  insert into notes (company_id, raw_transcript, attendees, action_items, ai_summary, ai_revenue, ai_traction, ai_raise_ask, ai_status, created_by)
  values (c, 'Dummy transcript: founder walked through unit economics and fleet pipeline.', '{"Asha Rao"}',
          'Send data room request', 'Swappable LFP packs leased to delivery fleets.', 'ARR ₹6Cr', '3,200 packs live',
          '₹30Cr Series A', 'ok', a);
  insert into market_research (company_id, url, title, created_by)
  values (c, 'https://example.com/ev-two-wheeler-report', 'EV two-wheeler fleet report (dummy link)', a);
  insert into decks (company_id, url, file_name, source, created_by)
  values (c, 'https://example.com/voltleaf-deck.pdf', 'Voltleaf Series A deck.pdf', 'link', a);

  -- 2. Gridwise: stalled 20 days in contacted
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Gridwise', 'gridwise.example', 'Demand response software for C&I buildings', 'Pre-seed', 'Bengaluru', '{}', b)
  returning id into c;
  perform add_sector_path(c, 'Energy > Grid > Demand response');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Seed', 80000000, 'contacted', b, 'Follow up on pilot data', current_date - 6, b);
  update companies set last_touched = now() - interval '20 days' where id = c;

  -- 3. Kiranakart: no next action, new
  insert into companies (name, website, one_liner, stage, location, last_round_stage, last_round_size, existing_investors, created_by)
  values ('Kiranakart', 'https://www.kiranakart.example/', 'B2B ordering app for neighbourhood stores', 'Seed', 'Jaipur',
          'Seed', 25000000, '{"Retail Angels"}', a)
  returning id into c;
  perform add_sector_path(c, 'Commerce > B2B > Retail supply');
  insert into deals (company_id, stage, pipeline_stage, owner, created_by)
  values (c, 'Pre-Series A', 'new', a, a);

  -- 4. Medisync: IC, overdue task on the deal
  insert into companies (name, website, one_liner, stage, location, last_round_stage, last_round_size, existing_investors, created_by)
  values ('Medisync Labs', 'medisync.example', 'Lab report interoperability for tier-2 hospitals', 'Series A', 'Hyderabad',
          'Series A', 200000000, '{"Health Ventures I","Beta Capital"}', b)
  returning id into c;
  perform add_sector_path(c, 'Healthcare > Health IT > Interoperability');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Series B', 600000000, 'ic', b, 'Circulate IC memo', current_date + 1, b)
  returning id into d;
  insert into tasks (title, company_id, deal_id, assignee, due_date, created_by)
  values ('Get customer list from Medisync', c, d, a, current_date - 3, b);

  -- 5. Farmlink: term sheet, waiting
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Farmlink', 'farmlink.example', 'Input credit for smallholder farmers', 'Seed', 'Indore', '{"Agri Seed Co"}', a)
  returning id into c;
  perform add_sector_path(c, 'Fintech > Lending > Agri credit');
  insert into deals (company_id, stage, round_size, pipeline_stage, status, owner, next_action, next_action_date, created_by)
  values (c, 'Series A', 250000000, 'term_sheet', 'waiting', a, 'Wait for founder response on valuation', current_date + 5, a);

  -- 6. Codepath: invested
  insert into companies (name, website, one_liner, stage, location, last_round_stage, last_round_size, existing_investors, created_by)
  values ('Codepath Tools', 'codepath.example', 'Code review automation for Indian IT services firms', 'Series A', 'Chennai',
          'Series A', 350000000, '{"Lead Invest (dummy)","Gamma Partners"}', b)
  returning id into c;
  perform add_sector_path(c, 'Software > Dev tools > Code review');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Series A', 350000000, 'invested', b, 'Quarterly check-in', current_date + 30, b);

  -- 7. Solarstack: passed with a revisit due today → back on the board, flagged
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Solarstack', 'solarstack.example', 'Rooftop solar financing marketplace', 'Seed', 'Ahmedabad', '{}', a)
  returning id into c;
  perform add_sector_path(c, 'Energy > Solar > Financing');
  insert into deals (company_id, stage, pipeline_stage, end_state, pass_reason, revisit_bucket, revisit_date, owner, created_by)
  values (c, 'Seed', 'research', 'passed', 'Too early, no repeat customers yet', 'backburner', current_date, a, a);

  -- 8. Tinyloop: watchlist, revisit in 4 days (shows in /review "this week")
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Tinyloop', 'tinyloop.example', 'Reusable packaging for D2C brands', 'Pre-seed', 'Mumbai', '{}', b)
  returning id into c;
  perform add_sector_path(c, 'Climate > Circular economy > Packaging');
  insert into deals (company_id, stage, pipeline_stage, end_state, revisit_bucket, revisit_date, owner, created_by)
  values (c, 'Seed', 'contacted', 'watchlist', 'backburner', current_date + 4, b, b);

  -- 9. Freightly: paused, parked for 90 days (hidden from the board until then)
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Freightly', 'freightly.example', 'Digital freight brokerage for SMEs', 'Series A', 'Delhi', '{"Logistics Fund II"}', a)
  returning id into c;
  perform add_sector_path(c, 'Logistics > Freight > Brokerage');
  insert into deals (company_id, stage, pipeline_stage, status, revisit_bucket, owner, created_by)
  values (c, 'Series B', 'research', 'paused', '90d', a, a);

  -- 10. Lumen Learn: contacted, next action overdue
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Lumen Learn', 'lumenlearn.example', 'Vernacular test prep app', 'Seed', 'Lucknow', '{"Edu Angels"}', b)
  returning id into c;
  perform add_sector_path(c, 'Consumer > Edtech > Test prep');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Series A', 150000000, 'contacted', b, 'Book second meeting', current_date - 2, b);

  -- 11. Cellcore: second battery company, new
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Cellcore', 'cellcore.example', 'Sodium-ion cells for stationary storage', 'Pre-seed', 'Bengaluru', '{}', a)
  returning id into c;
  perform add_sector_path(c, 'Energy > Battery > Sodium-ion');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Seed', 60000000, 'new', a, 'Intro call', current_date + 2, a);

  -- 12. Paystream: lost, no revisit (off the board)
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Paystream', 'paystream.example', 'Payroll and EWA for blue-collar workforce', 'Series A', 'Gurugram', '{"Delta VC"}', b)
  returning id into c;
  perform add_sector_path(c, 'Fintech > Payroll > Earned wage access');
  insert into deals (company_id, stage, pipeline_stage, end_state, pass_reason, owner, created_by)
  values (c, 'Series B', 'ic', 'lost', 'Round filled before IC', b, b);

  -- 13. Agrisense: research, stalled 16 days, no next action
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Agrisense', 'agrisense.example', 'Soil sensors with advisory for FPOs', 'Seed', 'Nashik', '{}', a)
  returning id into c;
  perform add_sector_path(c, 'Climate > Agritech > Soil sensing');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, created_by)
  values (c, 'Pre-Series A', 90000000, 'research', a, a);
  update companies set last_touched = now() - interval '16 days' where id = c;

  -- 14. Stitchly: new, healthy
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Stitchly', 'stitchly.example', 'On-demand garment manufacturing for small brands', 'Seed', 'Tiruppur', '{"Textile Angels"}', b)
  returning id into c;
  perform add_sector_path(c, 'Commerce > Manufacturing > Apparel');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Seed', 50000000, 'new', b, 'Review deck', current_date + 1, b);

  -- 15. Quanta Health: IC, owner b, task assigned b → a and a → b
  insert into companies (name, website, one_liner, stage, location, existing_investors, created_by)
  values ('Quanta Health', 'quantahealth.example', 'Remote cardiac monitoring for clinics', 'Series A', 'Kochi', '{"Health Ventures I"}', a)
  returning id into c;
  perform add_sector_path(c, 'Healthcare > Devices > Cardiac monitoring');
  insert into deals (company_id, stage, round_size, pipeline_stage, owner, next_action, next_action_date, created_by)
  values (c, 'Series B', 500000000, 'ic', a, 'Expert call with cardiologist', current_date + 4, a)
  returning id into d;
  insert into tasks (title, company_id, deal_id, assignee, due_date, created_by)
  values ('Find a cardiologist for expert call', c, d, b, current_date + 2, a);
  insert into tasks (title, company_id, assignee, due_date, status, created_by)
  values ('Share Quanta CDSCO approval doc', c, a, current_date - 1, 'done', b);

  -- A standalone task with no company
  insert into tasks (title, assignee, due_date, created_by)
  values ('Update sector map for climate', b, current_date + 7, a);
end $$;
