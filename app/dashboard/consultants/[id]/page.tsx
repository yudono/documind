'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  MessageCircle, 
  Calendar as CalendarIcon,
  Award,
  GraduationCap,
  Languages,
  CheckCircle,
  ArrowLeft,
  Users,
  TrendingUp
} from 'lucide-react';
import { format, addDays, isSameDay, isAfter, isBefore } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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
  
  // Booking form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingDescription, setBookingDescription] = useState('');
  const [duration, setDuration] = useState<number>(60);

  // Available time slots (mock data)
  const timeSlots: TimeSlot[] = [
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: false },
    { time: '13:00', available: true },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: false },
  ];

  useEffect(() => {
    fetchConsultantData();
    fetchReviews();
  }, [consultantId]);

  const fetchConsultantData = async () => {
    try {
      const response = await fetch(`/api/consultants/${consultantId}`);
      if (response.ok) {
        const data = await response.json();
        setConsultant(data);
      }
    } catch (error) {
      console.error('Error fetching consultant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/consultants/${consultantId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedType || !bookingTitle) {
      alert('Mohon lengkapi semua field yang diperlukan');
      return;
    }

    setIsBooking(true);

    const sessionDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);

    const bookingData = {
      consultantId,
      sessionType: selectedType,
      sessionDuration: duration,
      sessionDate: sessionDate.toISOString(),
      title: bookingTitle,
      description: bookingDescription || '',
      totalAmount: consultant!.hourlyRate * (duration / 60)
    };

    try {
      // First, create the booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (bookingResponse.ok) {
        const booking = await bookingResponse.json();
        
        // Then, create payment
        const paymentResponse = await fetch('/api/payment/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: booking.id,
          }),
        });

        if (paymentResponse.ok) {
          const payment = await paymentResponse.json();
          // Redirect to payment gateway
          window.location.href = payment.data.paymentUrl;
        } else {
          const paymentError = await paymentResponse.json();
          alert(paymentError.error || 'Gagal membuat pembayaran');
          setIsBooking(false);
        }
      } else {
        const bookingError = await bookingResponse.json();
        alert(bookingError.error || 'Gagal membuat booking. Silakan coba lagi.');
        setIsBooking(false);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
      setIsBooking(false);
    }
  };

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case 'video_call':
        return <Video className="h-4 w-4" />;
      case 'phone_call':
        return <Phone className="h-4 w-4" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'video_call':
        return 'Video Call';
      case 'phone_call':
        return 'Telepon';
      case 'chat':
        return 'Chat';
      case 'in_person':
        return 'Tatap Muka';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Konsultan tidak ditemukan</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profil Konsultan</h1>
          <p className="text-gray-600">Detail lengkap dan booking konsultasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={consultant.profileImage} alt={consultant.fullName} />
                    <AvatarFallback className="text-2xl">
                      {consultant.fullName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl font-bold text-gray-900">{consultant.fullName}</h1>
                        {consultant.isVerified && (
                          <CheckCircle className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <p className="text-lg text-gray-600 mb-2">{consultant.title}</p>
                      <Badge 
                        variant="secondary" 
                        style={{ backgroundColor: consultant.category.color + '20', color: consultant.category.color }}
                      >
                        {consultant.category.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="font-semibold">{consultant.averageRating}</span>
                      </div>
                      <p className="text-sm text-gray-600">{consultant.totalReviews} ulasan</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-semibold">{consultant.experience}</span>
                      </div>
                      <p className="text-sm text-gray-600">tahun</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-semibold">{consultant.completedBookings}</span>
                      </div>
                      <p className="text-sm text-gray-600">konsultasi</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-semibold">{consultant.responseTime}</span>
                      </div>
                      <p className="text-sm text-gray-600">respon</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {consultant.consultationTypes.map((type) => (
                      <Badge key={type} variant="outline" className="flex items-center gap-1">
                        {getConsultationTypeIcon(type)}
                        {getConsultationTypeLabel(type)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Content */}
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="about">Tentang</TabsTrigger>
              <TabsTrigger value="specializations">Keahlian</TabsTrigger>
              <TabsTrigger value="reviews">Ulasan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Tentang Konsultan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{consultant.bio}</p>
                </CardContent>
              </Card>

              {consultant.education && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Pendidikan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{consultant.education}</p>
                  </CardContent>
                </Card>
              )}

              {consultant.certifications && consultant.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Sertifikasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {consultant.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-gray-700">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {consultant.languages && consultant.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="h-5 w-5" />
                      Bahasa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {consultant.languages.map((lang, index) => (
                        <Badge key={index} variant="secondary">{lang}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="specializations">
              <Card>
                <CardHeader>
                  <CardTitle>Area Keahlian</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consultant.specializations.map((spec, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-gray-900">{spec}</span>
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
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.client.image} alt={review.client.name} />
                            <AvatarFallback>
                              {review.client.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{review.client.name}</h4>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-700 mb-2">{review.comment}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(review.createdAt), 'dd MMMM yyyy', { locale: localeId })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">Belum ada ulasan untuk konsultan ini.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Book Konsultasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  Rp {consultant.hourlyRate.toLocaleString('id-ID')}
                </div>
                <p className="text-gray-600">per jam</p>
              </div>

              <Separator />

              <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Book Sekarang
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Book Konsultasi dengan {consultant.fullName}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Date Selection */}
                    <div>
                      <Label className="text-base font-medium">Pilih Tanggal</Label>
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

                    {/* Time Selection */}
                    <div>
                      <Label className="text-base font-medium">Pilih Waktu</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className="text-sm"
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Consultation Type */}
                    <div>
                      <Label className="text-base font-medium">Tipe Konsultasi</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Pilih tipe konsultasi" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultant.consultationTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                {getConsultationTypeIcon(type)}
                                {getConsultationTypeLabel(type)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration */}
                    <div>
                      <Label className="text-base font-medium">Durasi</Label>
                      <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 menit</SelectItem>
                          <SelectItem value="60">1 jam</SelectItem>
                          <SelectItem value="90">1.5 jam</SelectItem>
                          <SelectItem value="120">2 jam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Booking Details */}
                    <div>
                      <Label htmlFor="title" className="text-base font-medium">Judul Konsultasi</Label>
                      <Input
                        id="title"
                        value={bookingTitle}
                        onChange={(e) => setBookingTitle(e.target.value)}
                        placeholder="Contoh: Konsultasi Kontrak Kerja"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-base font-medium">Deskripsi (Opsional)</Label>
                      <Textarea
                        id="description"
                        value={bookingDescription}
                        onChange={(e) => setBookingDescription(e.target.value)}
                        placeholder="Jelaskan detail yang ingin Anda konsultasikan..."
                        className="mt-2"
                        rows={3}
                      />
                    </div>

                    {/* Price Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Biaya:</span>
                        <span className="text-xl font-bold">
                          Rp {(consultant.hourlyRate * (duration / 60)).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {duration} menit × Rp {consultant.hourlyRate.toLocaleString('id-ID')}/jam
                      </p>
                    </div>

                    <Button 
                      onClick={handleBooking} 
                      className="w-full" 
                      size="lg"
                      disabled={!selectedDate || !selectedTime || !selectedType || !bookingTitle || isBooking}
                    >
                      {isBooking ? 'Memproses...' : 'Lanjut ke Pembayaran'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Respon: {consultant.responseTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Konsultan Terverifikasi</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConsultantProfilePage;