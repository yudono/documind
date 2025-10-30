"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Star,
  Clock,
  Phone,
  Video,
  MessageCircle,
  CheckCircle,
  ArrowLeft,
  Users,
  TrendingUp,
} from "lucide-react";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Consultant {
  id: string;
  fullName: string;
  title: string;
  bio: string;
  profileImage: string;
  experience: number;
  hourlyRate: number;
  currency: string;
  averageRating: number;
  totalReviews: number;
  responseTime: string;
  consultationTypes: string[];
  specializations: string[];
  category: {
    id: string;
    name: string;
    color: string;
  };
  isVerified: boolean;
  education?: string;
  certifications?: string[];
  languages?: string[];
  totalBookings: number;
  completedBookings: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  client: {
    name: string;
    image?: string;
  };
  createdAt: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const ConsultantProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const consultantId = params.id as string;

  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [duration, setDuration] = useState<number>(60);

  const timeSlots: TimeSlot[] = [
    { time: "09:00", available: true },
    { time: "10:00", available: true },
    { time: "11:00", available: false },
    { time: "13:00", available: true },
    { time: "14:00", available: true },
    { time: "15:00", available: true },
    { time: "16:00", available: false },
  ];

  useEffect(() => {
    fetchConsultantData();
    fetchReviews();
  }, [consultantId]);

  const fetchConsultantData = async () => {
    try {
      const response = await fetch(`/api/consultants/${consultantId}`);
      if (response.ok) {
        const { data } = await response.json();
        setConsultant(data);
      }
    } catch (error) {
      console.error("Error fetching consultant:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/consultants/${consultantId}/reviews`);
      if (response.ok) {
        const { data } = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedType || !bookingTitle) {
      alert("Mohon lengkapi semua field yang diperlukan");
      return;
    }

    setIsBooking(true);

    const sessionDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);

    const bookingData = {
      consultantId,
      sessionType: selectedType,
      sessionDuration: duration,
      sessionDate: sessionDate.toISOString(),
      title: bookingTitle,
      description: bookingDescription || "",
      totalAmount: consultant!.hourlyRate * (duration / 60),
    };

    try {
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (bookingResponse.ok) {
        const booking = await bookingResponse.json();
        const paymentResponse = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        });

        if (paymentResponse.ok) {
          const payment = await paymentResponse.json();
          window.location.href = payment.data.paymentUrl;
        } else {
          const paymentError = await paymentResponse.json();
          alert(paymentError.error || "Gagal membuat pembayaran");
          setIsBooking(false);
        }
      } else {
        const bookingError = await bookingResponse.json();
        alert(
          bookingError.error || "Gagal membuat booking. Silakan coba lagi."
        );
        setIsBooking(false);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Terjadi kesalahan. Silakan coba lagi.");
      setIsBooking(false);
    }
  };

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case "video_call":
        return <Video className="h-4 w-4" />;
      case "phone_call":
        return <Phone className="h-4 w-4" />;
      case "chat":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case "video_call":
        return "Video Call";
      case "phone_call":
        return "Telepon";
      case "chat":
        return "Chat";
      case "in_person":
        return "Tatap Muka";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="relative min-h-screen flex-1 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          <div className="relative z-10 p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="h-64 bg-muted rounded-lg mb-6"></div>
                  <div className="h-32 bg-muted rounded-lg"></div>
                </div>
                <div className="h-96 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="flex h-screen">
        <div className="relative min-h-screen flex-1 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          <div className="relative z-10 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">
                Konsultan tidak ditemukan
              </h1>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="relative min-h-screen flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="glass border-b p-4 h-20 flex items-center w-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="font-semibold">Profil Konsultan</h1>
                <p className="text-sm text-muted-foreground">
                  Detail lengkap dan booking konsultasi
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="mb-6 glass border-2">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-shrink-0">
                        <Avatar className="h-32 w-32">
                          <AvatarImage
                            className="object-cover"
                            src={consultant.profileImage}
                            alt={consultant.fullName}
                          />
                          <AvatarFallback className="text-2xl">
                            {consultant.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h1 className="text-2xl font-bold">
                                {consultant.fullName}
                              </h1>
                              {consultant.isVerified && (
                                <CheckCircle className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <p className="text-lg text-muted-foreground mb-2">
                              {consultant.title}
                            </p>
                            <Badge
                              variant="secondary"
                              style={{
                                backgroundColor:
                                  consultant.category.color + "20",
                                color: consultant.category.color,
                              }}
                            >
                              {consultant.category.name}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="font-semibold">
                                {consultant.averageRating}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {consultant.totalReviews} ulasan
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                              <span className="font-semibold">
                                {consultant.experience}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              tahun
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <Users className="h-4 w-4 text-muted-foreground mr-1" />
                              <span className="font-semibold">
                                {consultant.completedBookings}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              konsultasi
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <TrendingUp className="h-4 w-4 text-muted-foreground mr-1" />
                              <span className="font-semibold">
                                {consultant.responseTime}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              respon
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {consultant.consultationTypes.map((type) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {getConsultationTypeIcon(type)}
                              {getConsultationTypeLabel(type)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 glass">
                    <TabsTrigger value="about">Tentang</TabsTrigger>
                    <TabsTrigger value="specializations">Keahlian</TabsTrigger>
                    <TabsTrigger value="reviews">Ulasan</TabsTrigger>
                  </TabsList>
                  <TabsContent value="about" className="space-y-6">
                    <Card className="glass border-2">
                      <CardHeader>
                        <CardTitle>Tentang Konsultan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="leading-relaxed text-muted-foreground">
                          {consultant.bio}
                        </p>
                      </CardContent>
                    </Card>

                    {consultant.education && (
                      <Card className="glass border-2">
                        <CardHeader>
                          <CardTitle>Pendidikan</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">
                            {consultant.education}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {consultant.certifications &&
                      consultant.certifications.length > 0 && (
                        <Card className="glass border-2">
                          <CardHeader>
                            <CardTitle>Sertifikasi</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {consultant.certifications.map((cert, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-muted-foreground">
                                    {cert}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    {consultant.languages &&
                      consultant.languages.length > 0 && (
                        <Card className="glass border-2">
                          <CardHeader>
                            <CardTitle>Bahasa</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {consultant.languages.map((lang, index) => (
                                <Badge key={index} variant="secondary">
                                  {lang}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </TabsContent>

                  <TabsContent value="specializations">
                    <Card className="glass border-2">
                      <CardHeader>
                        <CardTitle>Area Keahlian</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {consultant.specializations.map((spec, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                            >
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="font-medium">{spec}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reviews">
                    <div className="space-y-4">
                      {reviews.length > 0 ? (
                        reviews.map((review) => (
                          <Card key={review.id} className="glass border-2">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={undefined}
                                    alt={review.client.name}
                                  />
                                  <AvatarFallback>
                                    {review.client.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">
                                      {review.client.name}
                                    </h4>
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${
                                            i < review.rating
                                              ? "text-yellow-400 fill-current"
                                              : "text-muted"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground mb-2">
                                    {review.comment}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(
                                      new Date(review.createdAt),
                                      "dd MMMM yyyy",
                                      { locale: localeId }
                                    )}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card className="glass border-2">
                          <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">
                              Belum ada ulasan untuk konsultan ini.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-4 glass border-2">
                  <CardHeader>
                    <CardTitle>Book Konsultasi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        Rp {consultant.hourlyRate.toLocaleString("id-ID")}
                      </div>
                      <p className="text-muted-foreground">per jam</p>
                    </div>

                    <Separator />

                    <Dialog
                      open={bookingDialogOpen}
                      onOpenChange={setBookingDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          size="lg"
                          disabled={isBooking}
                        >
                          Book Sekarang
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Book Konsultasi dengan {consultant.fullName}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                          <div>
                            <Label className="text-base font-medium">
                              Pilih Tanggal
                            </Label>
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) =>
                                isBefore(date, new Date()) ||
                                isAfter(date, addDays(new Date(), 30))
                              }
                              className="rounded-md border"
                            />
                          </div>

                          <div>
                            <Label className="text-base font-medium">
                              Pilih Waktu
                            </Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {timeSlots.map((slot) => (
                                <Button
                                  key={slot.time}
                                  variant={
                                    selectedTime === slot.time
                                      ? "default"
                                      : "outline"
                                  }
                                  disabled={!slot.available}
                                  onClick={() => setSelectedTime(slot.time)}
                                >
                                  {slot.time}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-base font-medium">
                              Tipe Konsultasi
                            </Label>
                            <Select
                              value={selectedType}
                              onValueChange={setSelectedType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih tipe" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video_call">
                                  Video Call
                                </SelectItem>
                                <SelectItem value="phone_call">
                                  Telepon
                                </SelectItem>
                                <SelectItem value="chat">Chat</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-base font-medium">
                              Judul
                            </Label>
                            <Input
                              value={bookingTitle}
                              onChange={(e) => setBookingTitle(e.target.value)}
                              placeholder="Judul sesi"
                            />
                          </div>

                          <div>
                            <Label className="text-base font-medium">
                              Deskripsi
                            </Label>
                            <Textarea
                              value={bookingDescription}
                              onChange={(e) =>
                                setBookingDescription(e.target.value)
                              }
                              placeholder="Deskripsi kebutuhan konsultasi"
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label className="text-base font-medium">
                              Durasi (menit)
                            </Label>
                            <Select
                              value={String(duration)}
                              onValueChange={(v) => setDuration(Number(v))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="60">60</SelectItem>
                                <SelectItem value="90">90</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setBookingDialogOpen(false)}
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={handleBooking}
                              disabled={isBooking}
                            >
                              Lanjutkan Pembayaran
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantProfilePage;
