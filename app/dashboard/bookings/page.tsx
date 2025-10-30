'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  Video, 
  MessageCircle, 
  Phone,
  Star,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Booking {
  id: string;
  consultationType: string;
  duration: number;
  scheduledAt: string;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt: string;
  consultant: {
    id: string;
    user: {
      name: string;
      email: string;
      image?: string;
    };
    specialization: string;
    category: {
      name: string;
      color: string;
    };
  };
  payment?: {
    id: string;
    paymentReference: string;
    paymentMethod: string;
    status: string;
    paidAt?: string;
  };
}

const BookingManagementPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_payment':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: localeId });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: localeId });
  };

  const filterBookings = (status: string) => {
    if (status === 'all') return bookings;
    return bookings.filter(booking => booking.status === status);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan booking ini?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        fetchBookings(); // Refresh the list
      } else {
        alert('Gagal membatalkan booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Terjadi kesalahan saat membatalkan booking');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch(`/api/consultants/${selectedBooking.consultant?.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      if (response.ok) {
        setReviewDialogOpen(false);
        setReviewRating(5);
        setReviewComment('');
        fetchBookings(); // Refresh to update review status
      } else {
        alert('Gagal mengirim review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Terjadi kesalahan saat mengirim review');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Booking Saya</h1>
        <p className="text-gray-600">Kelola dan pantau semua booking konsultasi Anda</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Semua ({bookings.length})</TabsTrigger>
          <TabsTrigger value="confirmed">Dikonfirmasi ({filterBookings('confirmed').length})</TabsTrigger>
          <TabsTrigger value="pending_payment">Menunggu Bayar ({filterBookings('pending_payment').length})</TabsTrigger>
          <TabsTrigger value="completed">Selesai ({filterBookings('completed').length})</TabsTrigger>
          <TabsTrigger value="cancelled">Dibatalkan ({filterBookings('cancelled').length})</TabsTrigger>
        </TabsList>

        {['all', 'confirmed', 'pending_payment', 'completed', 'cancelled'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filterBookings(status).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Tidak ada booking
                  </h3>
                  <p className="text-gray-500 text-center">
                    {status === 'all' 
                      ? 'Anda belum memiliki booking apapun. Mulai konsultasi dengan ahli kami!'
                      : `Tidak ada booking dengan status ${status === 'confirmed' ? 'dikonfirmasi' : 
                          status === 'pending_payment' ? 'menunggu pembayaran' :
                          status === 'completed' ? 'selesai' : 'dibatalkan'}.`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filterBookings(status).map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={booking.consultant?.user?.image || ''} />
                          <AvatarFallback>
                            {booking.consultant?.user?.name?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {booking.consultant?.user?.name || 'Consultant'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {booking.consultant?.specialization || 'Specialization not available'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(booking.status)}
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status === 'confirmed' ? 'Dikonfirmasi' :
                                 booking.status === 'pending_payment' ? 'Menunggu Bayar' :
                                 booking.status === 'completed' ? 'Selesai' :
                                 booking.status === 'cancelled' ? 'Dibatalkan' : booking.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span>{formatDate(booking.scheduledAt)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span>{formatTime(booking.scheduledAt)} ({booking.duration} menit)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getConsultationTypeIcon(booking.consultationType)}
                              <span className="capitalize">{booking.consultationType.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CreditCard className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">{formatCurrency(booking.totalAmount)}</span>
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{booking.notes}</p>
                            </div>
                          )}

                          {booking.payment && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center justify-between text-sm">
                                <span>Pembayaran: {booking.payment.paymentMethod}</span>
                                <Badge variant={booking.payment.status === 'PAID' ? 'default' : 'secondary'}>
                                  {booking.payment.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Ref: {booking.payment.paymentReference}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {booking.status === 'pending_payment' && (
                          <Button size="sm" variant="default">
                            Bayar Sekarang
                          </Button>
                        )}
                        
                        {booking.status === 'confirmed' && new Date(booking.scheduledAt) > new Date() && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Batalkan
                          </Button>
                        )}

                        {booking.status === 'completed' && (
                          <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Berikan Review</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Rating</label>
                                  <div className="flex space-x-1 mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        onClick={() => setReviewRating(star)}
                                        className={`p-1 ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                      >
                                        <Star className="h-6 w-6 fill-current" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Komentar</label>
                                  <Textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Bagikan pengalaman Anda..."
                                    className="mt-1"
                                  />
                                </div>
                                <Button onClick={handleSubmitReview} className="w-full">
                                  Kirim Review
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default BookingManagementPage;