import { motion } from "framer-motion";
import { Crown, Drama, Sparkles, Theater } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

interface TeatroRoom {
  id: string;
  title: string;
  country: string;
  hosts: string;
  description: string;
  image: string;
  vip: boolean;
}

const teatroRooms: TeatroRoom[] = [];

const TeatroHub = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(350_95%_62%/0.2),transparent_30%),radial-gradient(circle_at_85%_95%,hsl(var(--primary)/0.2),transparent_35%)]" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-red-900/20 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-red-900/20 to-transparent" />
      </div>

      <main className="relative z-10 px-6 pb-20 pt-28">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.2em] text-red-200">
              <Drama className="h-4 w-4" />
              TeatroHub
            </span>
            <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
              STAND-UP / <span className="text-gradient-neon">TEATRO</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
              Cartelera premium con curaduria internacional, lobbies interactivos y experiencias VIP estratosas.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {teatroRooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Link
                  to={`/teatro/${room.id}`}
                  className="group block overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-red-300/60 hover:shadow-[0_0_45px_-14px_rgba(244,63,94,0.65)]"
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl border border-red-400/20">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    {room.vip && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-display font-bold uppercase text-black">
                        <Crown className="h-3 w-3" />
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-foreground">{room.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-wider text-red-200/90">{room.country}</p>
                    </div>
                    <Theater className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{room.hosts}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{room.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-display uppercase tracking-widest text-primary">
                    <Sparkles className="h-4 w-4" />
                    Entrar a sala
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeatroHub;
