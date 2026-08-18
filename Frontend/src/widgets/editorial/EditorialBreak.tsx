import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const WORDS =
  "SUMAN / AFTER HOURS / 2026 / MADE TO MOVE / SUMAN / AFTER HOURS / 2026 / MADE TO MOVE / SUMAN / AFTER HOURS / 2026 / MADE TO MOVE / SUMAN / AFTER HOURS / 2026 / MADE TO MOVE / SUMAN / AFTER HOURS / 2026 / MADE TO MOVE / SUMAN / AFTER HOURS / 2026 / MADE TO MOVE / ";

export function EditorialBreak() {
  return (
    <section
      className="overflow-hidden bg-ink text-canvas"
      aria-label="Suman editorial"
    >
      <div className="border-y border-white/10 py-3 text-[10px] font-medium uppercase tracking-[0.25em] text-canvas/60">
        <div className="marquee-track whitespace-nowrap">
          {WORDS}
          {WORDS}
        </div>
      </div>

      <div className="editorial-grid container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-electric">
            The Suman point of view
          </p>
          <h2 className="max-w-3xl text-5xl leading-[0.9] tracking-[-0.06em] text-canvas sm:text-7xl lg:text-8xl">
            Dress like the night is still young.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="max-w-sm lg:justify-self-end"
        >
          <p className="text-sm leading-7 text-canvas/65">
            Considered silhouettes for crowded rooms, late trains and the
            version of you that does not ask for permission.
          </p>
          <Link
            to="/women"
            className="mt-7 inline-flex items-center gap-3 border-b border-electric pb-2 text-xs font-medium uppercase tracking-[0.16em] text-electric transition-[gap] hover:gap-5"
          >
            Explore the edit <span aria-hidden="true">-&gt;</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
