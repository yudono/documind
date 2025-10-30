"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Star,
  Clock,
  Video,
  Phone,
  MessageCircle,
  User,
  Icon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import DynamicIcon from "@/components/icons/dynamic-icon";
interface ConsultantCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

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
  category: ConsultantCategory;
  isVerified: boolean;
}

export default function ConsultantsPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [categories, setCategories] = useState<ConsultantCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [sortBy, setSortBy] = useState("rating");
  const [consultationType, setConsultationType] = useState<string>("all");

  useEffect(() => {
    fetchConsultants();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/consultants/categories");
      if (response.ok) {
        const { data } = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchConsultants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        // category: selectedCategory,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
        sortBy,
        // consultationType,
      });

      const response = await fetch(`/api/consultants?${params}`);
      if (response.ok) {
        const { data } = await response.json();
        setConsultants(data || []);
      }
    } catch (error) {
      console.error("Error fetching consultants:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case "video_call":
        return <Video className="h-4 w-4" />;
      case "phone_call":
        return <Phone className="h-4 w-4" />;
      case "chat":
        return <MessageCircle className="h-4 w-4" />;
      case "in_person":
        return <User className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case "video_call":
        return "Video Call";
      case "phone_call":
        return "Phone Call";
      case "chat":
        return "Chat";
      case "in_person":
        return "Tatap Muka";
      default:
        return type;
    }
  };

  return (
    <div className="flex h-screen">
      <div className="relative min-h-screen flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="glass border-b p-4 h-20 flex items-center w-full">
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="font-semibold">Consultants</h1>
                <p className="text-sm text-muted-foreground">
                  Temukan konsultan terverifikasi untuk kebutuhan Anda
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 relative h-[calc(100vh-80px)] overflow-auto">
            {/* Categories */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Kategori Konsultan</h2>
              <div className="grid grid-cols-6 gap-4">
                {categories.slice(0, 6).map((category) => (
                  <Card
                    key={category.id}
                    className={`cursor-pointer transition-all hover:shadow-md glass border-2 ${
                      selectedCategory === category.id
                        ? "ring-2 ring-primary/40"
                        : ""
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <img
                        src={category.icon || "https://placehold.co/400"}
                        className="mx-auto mb-2 w-12 h-12 rounded-full overflow-hidden object-cover"
                        alt={category.name}
                      />
                      <h3 className="font-semibold text-sm mb-1">
                        {category.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Cari konsultan berdasarkan nama, keahlian, atau spesialisasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating Tertinggi</SelectItem>
                    <SelectItem value="price_low">Harga Terendah</SelectItem>
                    <SelectItem value="price_high">Harga Tertinggi</SelectItem>
                    <SelectItem value="experience">Pengalaman</SelectItem>
                    <SelectItem value="reviews">Ulasan Terbanyak</SelectItem>
                  </SelectContent>
                </Select>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filter Konsultan</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Kategori
                        </label>
                        <Select
                          value={selectedCategory}
                          onValueChange={setSelectedCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Rentang Harga (per jam): {formatPrice(priceRange[0])}{" "}
                          - {formatPrice(priceRange[1])}
                        </label>
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          max={2000000}
                          min={50000}
                          step={50000}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Tipe Konsultasi
                        </label>
                        <Select
                          value={consultationType}
                          onValueChange={setConsultationType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe konsultasi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Tipe</SelectItem>
                            <SelectItem value="video_call">
                              Video Call
                            </SelectItem>
                            <SelectItem value="phone_call">
                              Phone Call
                            </SelectItem>
                            <SelectItem value="chat">Chat</SelectItem>
                            <SelectItem value="in_person">
                              Tatap Muka
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Consultants Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse glass border-2">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : consultants.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  Tidak ada konsultan ditemukan
                </h3>
                <p className="text-muted-foreground">
                  Coba ubah filter pencarian atau kata kunci Anda
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {consultants.map((consultant) => (
                  <Card
                    key={consultant.id}
                    className="hover:shadow-lg transition-shadow glass border-2"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarImage
                              src={consultant.profileImage}
                              alt={consultant.fullName}
                              className="w-16 h-16 rounded-full overflow-hidden object-cover"
                            />
                            <AvatarFallback>
                              {consultant.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          {consultant.isVerified && (
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                              <svg
                                className="h-3 w-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {consultant.fullName}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-1">
                            {consultant.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {consultant.category.name}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {consultant.averageRating.toFixed(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({consultant.totalReviews} ulasan)
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{consultant.responseTime}</span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {consultant.bio}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div>
                            <div className="text-lg font-bold">
                              {formatPrice(consultant.hourlyRate)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              per jam
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {consultant.consultationTypes
                              .slice(0, 3)
                              .map((type, index) => (
                                <div
                                  key={index}
                                  className="p-1 bg-muted rounded"
                                  title={getConsultationTypeLabel(type)}
                                >
                                  {getConsultationTypeIcon(type)}
                                </div>
                              ))}
                          </div>
                        </div>

                        <Link href={`/dashboard/consultant/${consultant.id}`}>
                          <Button className="w-full mt-4">
                            Lihat Profil & Pesan
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
