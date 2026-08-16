import { Link } from "react-router-dom";
import Reveal from "../../components/Reveal/Reveal";
import SwingTag from "../../components/SwingTag/SwingTag";
import SEO from "../../components/SEO/SEO";
import "./about.css";

const VALUES = [
  { title: "الجودة أولًا", desc: "قماش ثقيل، خياطة محكمة، وتفاصيل اتراجعت أكتر من مرة قبل ما توصلك." },
  { title: "هوية واضحة", desc: "كل قطعة بتحمل توقيع SOALECT من التصميم للطباعة — مش مجرد لوجو." },
  { title: "قريبين منك", desc: "بنسمع فيدباك عملائنا فعليًا، وده بيشكل كل دروب جديد." },
];

export default function About() {
  return (
    <>
      <SEO
        title="من نحن"
        description="تعرف على قصة SOALECT — ماركة ستريت وير مصرية بتركز على الجودة والتفاصيل الحقيقية."
        path="/about"
      />
      <section className="section container about-hero">
        <Reveal>
          <SwingTag>SOALECT STORY</SwingTag>
          <h1 className="about-hero__title">مش مجرد براند ملابس.</h1>
          <p className="about-hero__desc">
            SOALECT بدأت من فكرة بسيطة: الملابس اللي بتلبسها لازم تحكي حاجة عنك.
            مش بس تريند بنلحقه — إحنا بنركز على القماش، القصة، والتفاصيل اللي
            فعلًا بتفرق. كل دروب بنطلعه بيمر بمراحل تصميم وتجربة حقيقية قبل
            ما يوصلك.
          </p>
        </Reveal>
      </section>

      <section className="section container about-values">
        <Reveal>
          <h2 className="section-title" style={{ marginBottom: 32 }}>ليه SOALECT؟</h2>
        </Reveal>
        <div className="about-values__grid">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08} className="value-card">
              <span className="value-card__num">0{i + 1}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <div className="container about-cta__inner">
          <Reveal>
            <h2>جاهز تجرب SOALECT؟</h2>
            <p>تصفح أحدث التشكيلة دلوقتي.</p>
            <Link to="/products" className="btn btn-primary">تسوق الآن</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
