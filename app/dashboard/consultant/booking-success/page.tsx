'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, Clock, Video, Phone, MessageCircle, ArrowLeft, Home } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const BookingSuccessPage = () => {
  const router = useRouter();
  const params = useSearchParams();

  const consultantName = params.get('consultantName') || 'Konsultan';
  const sessionType = params.get('sessionType') || 'video_call';
  const sessionDate = params.get('sessionDate');
  const duration = Number(params.get('duration') || 60);
  const amount = Number(params.get('amount') || 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video_call':
        return <Video className="h-4 w-4" />;
      case 'phone_call':
        return <Phone className="h-4 w-4" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-screen">
      <div className="relative min-h-screen flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="relative z-10 p-8">
          <Card className="max-w-2xl mx-auto glass border-2">
            <CardHeader className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <CardTitle className="text-2xl">Pembayaran Berhasil</CardTitle>
              <p className="text-muted-foreground">Booking konsultasi Anda telah dikonfirmasi.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="font-medium mb-1">Konsultan</div>
                  <div className="text-muted-foreground">{consultantName}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="font-medium mb-1">Tipe Sesi</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getTypeIcon(sessionType)}
                      {sessionType}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="font-medium mb-1">Tanggal</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {sessionDate ? format(new Date(sessionDate), 'dd MMMM yyyy', { locale: localeId }) : '-'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="font-medium mb-1">Durasi</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {duration} menit
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="font-medium mb-1">Total Pembayaran</div>
                <div className="text-2xl font-bold">Rp {amount.toLocaleString('id-ID')}</div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </Button>
                <Button onClick={() => router.push('/dashboard/consultant')}>
                  <Home className="h-4 w-4 mr-2" />
                  Ke daftar konsultan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;