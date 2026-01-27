"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getAllVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  COMMON_AMENITIES,
} from "@/lib/venues/actions";
import type { Database } from "@/types/database";
import { Plus, Pencil, Trash2, Info, MapPin, Phone, Globe, Car } from "lucide-react";

type Venue = Database['public']['Tables']['venues']['Row'];

export default function VenuesSettingsPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "USA",
    phone: "",
    website: "",
    numberOfRinks: "1",
    parkingInfo: "",
    amenities: [] as string[],
  });

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    setLoading(true);
    const result = await getAllVenues();

    if (result.error) {
      toast.error(result.error);
    } else {
      setVenues(result.venues);
    }

    setLoading(false);
  }

  function resetForm() {
    setFormData({
      name: "",
      address: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "USA",
      phone: "",
      website: "",
      numberOfRinks: "1",
      parkingInfo: "",
      amenities: [],
    });
  }

  function openEditDialog(venue: Venue) {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      address: venue.address || "",
      city: venue.city || "",
      stateProvince: venue.state_province || "",
      postalCode: venue.postal_code || "",
      country: venue.country || "USA",
      phone: venue.phone || "",
      website: venue.website || "",
      numberOfRinks: venue.number_of_rinks?.toString() || "1",
      parkingInfo: venue.parking_info || "",
      amenities: (venue.amenities as string[]) || [],
    });
  }

  function toggleAmenity(amenity: string) {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  }

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error("Please enter a venue name");
      return;
    }

    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("address", formData.address);
    form.set("city", formData.city);
    form.set("stateProvince", formData.stateProvince);
    form.set("postalCode", formData.postalCode);
    form.set("country", formData.country);
    form.set("phone", formData.phone);
    form.set("website", formData.website);
    form.set("numberOfRinks", formData.numberOfRinks);
    form.set("parkingInfo", formData.parkingInfo);
    form.set("amenitiesJson", JSON.stringify(formData.amenities));

    const result = await createVenue(form);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Venue created successfully!");
      setIsCreateOpen(false);
      resetForm();
      loadVenues();
    }
    setIsSaving(false);
  }

  async function handleUpdate() {
    if (!editingVenue) return;

    if (!formData.name.trim()) {
      toast.error("Please enter a venue name");
      return;
    }

    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("address", formData.address);
    form.set("city", formData.city);
    form.set("stateProvince", formData.stateProvince);
    form.set("postalCode", formData.postalCode);
    form.set("country", formData.country);
    form.set("phone", formData.phone);
    form.set("website", formData.website);
    form.set("numberOfRinks", formData.numberOfRinks);
    form.set("parkingInfo", formData.parkingInfo);
    form.set("amenitiesJson", JSON.stringify(formData.amenities));

    const result = await updateVenue(editingVenue.id, form);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Venue updated successfully!");
      setEditingVenue(null);
      resetForm();
      loadVenues();
    }
    setIsSaving(false);
  }

  async function handleDelete(venueId: string) {
    const result = await deleteVenue(venueId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Venue deleted successfully!");
      setDeletingVenueId(null);
      loadVenues();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const VenueFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="venue-name">Venue Name *</Label>
        <Input
          id="venue-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Riverside Ice Arena"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue-address">Street Address</Label>
        <Input
          id="venue-address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Main St"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venue-city">City</Label>
          <Input
            id="venue-city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Toronto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-state">State/Province</Label>
          <Input
            id="venue-state"
            value={formData.stateProvince}
            onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
            placeholder="ON"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venue-postal">Postal Code</Label>
          <Input
            id="venue-postal"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            placeholder="M5H 2N2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-country">Country</Label>
          <Input
            id="venue-country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="USA"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="venue-phone">Phone</Label>
          <Input
            id="venue-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-rinks">Number of Rinks *</Label>
          <Input
            id="venue-rinks"
            type="number"
            min="1"
            max="10"
            value={formData.numberOfRinks}
            onChange={(e) => setFormData({ ...formData, numberOfRinks: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue-website">Website</Label>
        <Input
          id="venue-website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue-parking">Parking Information</Label>
        <Textarea
          id="venue-parking"
          value={formData.parkingInfo}
          onChange={(e) => setFormData({ ...formData, parkingInfo: e.target.value })}
          placeholder="Free parking available in lot A..."
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label>Amenities</Label>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {COMMON_AMENITIES.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={formData.amenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              <label
                htmlFor={`amenity-${amenity}`}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {amenity}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Venue Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage venues and rinks where your league games are played.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <CardDescription className="text-sm text-blue-900">
              Add venues to your league so you can assign them to games during scheduling.
              Include details like address, amenities, and parking information to help players find the venue.
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Venue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Venue</DialogTitle>
              <DialogDescription>
                Add a new venue or rink where your league plays games.
              </DialogDescription>
            </DialogHeader>
            <VenueFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Venue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Venues Table */}
      {venues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No venues yet. Create your first venue!</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Venue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Venues ({venues.length})</CardTitle>
            <CardDescription>
              All venues configured for this league
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Rinks</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {venue.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {venue.city && venue.state_province ? (
                          <span className="text-sm">{venue.city}, {venue.state_province}</span>
                        ) : venue.city ? (
                          <span className="text-sm">{venue.city}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{venue.number_of_rinks || 1}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {venue.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{venue.phone}</span>
                            </div>
                          )}
                          {venue.website && (
                            <div className="flex items-center gap-1 text-sm">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <a
                                href={venue.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Website
                              </a>
                            </div>
                          )}
                          {!venue.phone && !venue.website && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(venue)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingVenueId(venue.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingVenue} onOpenChange={(open) => {
        if (!open) {
          setEditingVenue(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>
              Update venue information and settings.
            </DialogDescription>
          </DialogHeader>
          <VenueFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingVenue(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingVenueId} onOpenChange={(open) => !open && setDeletingVenueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Venue?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this venue? This action cannot be undone.
              Games currently assigned to this venue will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVenueId && handleDelete(deletingVenueId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Venue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
