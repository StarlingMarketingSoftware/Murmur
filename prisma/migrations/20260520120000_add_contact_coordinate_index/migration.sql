-- Speed up viewport-bounded map overlay queries.
CREATE INDEX "Contact_latitude_longitude_idx" ON "Contact"("latitude", "longitude");
CREATE INDEX "Contact_longitude_latitude_idx" ON "Contact"("longitude", "latitude");
