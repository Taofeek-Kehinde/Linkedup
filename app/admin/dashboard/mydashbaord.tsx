"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./mydashbaord.module.css";

export default function MyDashboard() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(225);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev <= 0 ? 225 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <div className={styles.page}>

        {/* Background */}
        <div className={styles.background}>
          <div className={styles.blurOverlay} />
        </div>

        {/* Floating Glass Card */}
        <div className={styles.glassCard}>

          {/* Gloss Reflection */}
          <div className={styles.glassReflection}></div>

          {/* Timer */}
          <div className={styles.timerOuter}>

            <div className={styles.timerGlow}></div>

            <div className={styles.timerInner}>
              <Image
                src="/timer.png"
                alt="Timer"
                width={96}
                height={96}
                className="object-contain"
              />
            </div>

          </div>

          {/* Text */}

          <div className={styles.description}>
            No Contact. No Profile. Just Talk.
          </div>

          {/* Bottom Buttons */}

          <div className={styles.buttonRow}>

            <button
              className={styles.circleButton}
              onClick={() => router.push("/admin/create")}
              type="button"
            >
              <Image src="/link.png" alt="Link" width={70} height={70} className="object-contain" />
            </button>

            <button className={styles.circleButton}>
              <Image src="/user.png" alt="User" width={200} height={200} className="object-contain" />
            </button>

          </div>

        </div>

        {/* Footer */}

        <div className={styles.footer}>

          <h1>Talking Stage</h1>

          <p>© MIKI&nbsp;&nbsp;+2349033666403</p>

        </div>

      </div>

      <style jsx>{`

*{
margin:0;
padding:0;
box-sizing:border-box;
overflow-hidden;
}

html,
body{

width:100%;
height:100%;
overflow:hidden;
font-family:
Georgia,
"Times New Roman",
serif;

}

.page{

position:relative;

width:100vw;
height:100vh;

display:flex;
justify-content:center;
align-items:center;
overflow:hidden;

background:#000;

}



.background{

position:absolute;
left:0;
right:0;
top:0;
height:120vh;
background-image:url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80");

background-size:cover;
background-position:center;

transform:scale(1.12);

filter:
blur(8px)
brightness(.88);

}

.blurOverlay{

position:absolute;
inset:0;

background:

linear-gradient(

180deg,

rgba(255,255,255,.02),

rgba(0,0,0,.18)

);

backdrop-filter:blur(8px);

}

.glassCard{

position:relative;

width:430px;
height:365px;

display:flex;
flex-direction:column;
justify-content:center;
align-items:center;

border-radius:34px;

overflow:hidden;

background:
linear-gradient(
180deg,
rgba(255,255,255,.38),
rgba(255,255,255,.12)
);

border:1.5px solid rgba(255,255,255,.55);

backdrop-filter:
blur(40px)
saturate(180%)
brightness(120%);

-webkit-backdrop-filter:
blur(40px)
saturate(180%)
brightness(120%);

box-shadow:

0 35px 80px rgba(0,0,0,.30),

0 10px 30px rgba(255,255,255,.08),

inset 0 2px 1px rgba(255,255,255,.95),

inset 0 -2px 2px rgba(255,255,255,.15);

animation:
floatCard 6s ease-in-out infinite;

}


.glassCard::before{

content:"";

position:absolute;

top:-40%;
left:-70%;

width:220%;
height:70%;

background:

linear-gradient(

115deg,

transparent,

rgba(255,255,255,.8),

transparent

);

filter:blur(15px);

transform:rotate(-16deg);

animation:
glassSweep 9s linear infinite;

}

.glassCard::after{

content:"";

position:absolute;

inset:0;

border-radius:34px;

background:

radial-gradient(

circle at top,

rgba(255,255,255,.40),

transparent 45%

);

pointer-events:none;

}

.glassReflection{

position:absolute;

top:-40%;

left:-60%;

width:170%;

height:70%;

background:

linear-gradient(

120deg,

transparent,

rgba(255,255,255,.45),

transparent

);

transform:rotate(-18deg);

animation:shine 8s linear infinite;

pointer-events:none;

}

/* ======================= */
/* TIMER */
/* ======================= */

.timerOuter{

position:relative;

width:170px;
height:170px;

display:flex;
justify-content:center;
align-items:center;

border-radius:50%;

background:

linear-gradient(

145deg,

#ffffff,

#f4f4f4,

#cfcfcf,

#ffffff

);

box-shadow:

0 20px 40px rgba(0,0,0,.28),

inset 0 4px 6px rgba(255,255,255,1),

inset 0 -5px 8px rgba(150,150,150,.35);

animation:
ringFloat 5s ease-in-out infinite;

}

.timerGlow{

position:absolute;

width:175px;
height:175px;

border-radius:50%;

background:

radial-gradient(

circle,

rgba(255,255,255,.35),

transparent 70%

);

filter:blur(18px);

}

.timerInner{

width:128px;
height:128px;

border-radius:50%;

display:flex;
justify-content:center;
align-items:center;

background:

radial-gradient(

circle at top,

#777,

#444,

#202020

);

color:white;

font-size:46px;

font-weight:300;

letter-spacing:1px;

box-shadow:

inset 0 0 20px rgba(255,255,255,.25),

0 0 12px rgba(0,0,0,.35);

text-shadow:

0 2px 4px rgba(0,0,0,.4);

}

.description{

margin-top:28px;

font-size:27px;

font-weight:600;

text-align:center;

color:white;

text-shadow:

0 3px 8px rgba(0,0,0,.45);

padding:0 18px;

line-height:1.2;

}

.buttonRow{

width:100%;

padding:0 30px;

display:flex;

justify-content:space-between;

margin-top:30px;

}

.circleButton{

width:64px;
height:64px;

border-radius:50%;

border:1px solid rgba(255,255,255,.45);

background:

linear-gradient(
180deg,
rgba(255,255,255,.95),
rgba(220,220,220,.82)
);

display:flex;
align-items:center;
justify-content:center;

cursor:pointer;

transition:.35s ease;

box-shadow:

0 12px 30px rgba(0,0,0,.25),

inset 0 2px 3px rgba(255,255,255,.95),

inset 0 -2px 4px rgba(0,0,0,.12);

backdrop-filter:blur(12px);

}

.circleButton svg{

color:#111;

transition:.35s;

}

.circleButton:hover{

transform:

translateY(-4px)
scale(1.06);

box-shadow:

0 20px 45px rgba(0,0,0,.35),

inset 0 2px 4px rgba(255,255,255,1);

}

.circleButton:active{

transform:scale(.95);

}

.footer{

position:absolute;

bottom:55px;

left:50%;

transform:translateX(-50%);

text-align:center;

z-index:50;

width:100%;

}

.footer h1{

font-size:64px;

font-weight:500;

color:#111;

letter-spacing:.5px;

text-shadow:

0 2px 2px rgba(255,255,255,.45);

}

.footer p{

margin-top:18px;

font-size:24px;

font-weight:500;

color:#111;

letter-spacing:1px;

text-shadow:

0 2px 2px rgba(255,255,255,.45);

}

@keyframes shine{

0%{

transform:
translateX(-150%)
rotate(-18deg);

}

100%{

transform:
translateX(180%)
rotate(-18deg);

}

}

@media (max-width:900px){

.glassCard{

width:380px;
height:340px;

}

.timerOuter{

width:150px;
height:150px;

}

.timerGlow{

width:160px;
height:160px;

}

.timerInner{

width:118px;
height:118px;

font-size:40px;

}

.description{

font-size:24px;

}

.footer h1{

font-size:52px;

}

.footer p{

font-size:20px;

}

}

@media (max-width:768px){

.glassCard{

width:92%;
max-width:360px;

height:320px;

border-radius:28px;

}

.timerOuter{

width:145px;
height:145px;

}

.timerGlow{

width:155px;
height:155px;

}

.timerInner{

width:112px;
height:112px;

font-size:38px;

}

.description{

font-size:22px;

padding:0 20px;

}

.buttonRow{

padding:0 24px;

}

.circleButton{

width:58px;
height:58px;

}

.footer{

bottom:35px;

}

.footer h1{

font-size:42px;

}

.footer p{

font-size:17px;

margin-top:10px;

}

}

@media (max-width:480px){

.background{

transform:scale(1.25);

}

.glassCard{

height:300px;

}

.timerOuter{

width:132px;
height:132px;

}

.timerGlow{

width:145px;
height:145px;

}

.timerInner{

width:102px;
height:102px;

font-size:34px;

}

.description{

font-size:18px;

}

.circleButton{

width:54px;
height:54px;

}

.footer h1{

font-size:34px;

}

.footer p{

font-size:15px;

}

}

`}</style>

    </>
  );
}