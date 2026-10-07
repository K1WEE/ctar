import 'zone.js';
import { signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { GameComponent } from './app/components/game/game.component';
import { SupabaseService } from './app/services/supabase.service';
import { DataSyncService } from './app/services/data-sync.service';
import { CtarLogicService } from './app/services/ctar-logic.service';
import { BleService } from './app/services/ble.service';
const force=signal(0), reps=signal(0);
localStorage.setItem('zen_balloon_muted','true');
bootstrapApplication(AppComponent,{providers:[provideAnimations(),provideRouter([{path:'game',component:GameComponent},{path:'**',redirectTo:'game'}]),
{provide:SupabaseService,useValue:{isInitialized:signal(false),currentUser:signal(null),userRole:signal('user')}},
{provide:DataSyncService,useValue:{}},
{provide:CtarLogicService,useValue:{currentForce:force,peakForce:signal(20),repCount:reps,calibrationMaxForce:signal(20),resetSession:()=>{reps.set(0);force.set(0)},setSessionPaused:()=>{},getSessionSnapshot:()=>({})}},
{provide:BleService,useValue:{connectionState:signal('Connected'),lastSampleAt:signal(1),isSampleFresh:()=>true,batteryPercent:signal(90),batteryLevel:signal('normal'),batteryNotice:signal(null),isSimulated:signal(false)}}]});
