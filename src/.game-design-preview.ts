import 'zone.js';
import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { ZenBalloonComponent } from './app/components/zen-balloon/zen-balloon.component';
import { SupabaseService } from './app/services/supabase.service';
import { BleService } from './app/services/ble.service';
@Component({standalone:true,imports:[ZenBalloonComponent],template:'<app-zen-balloon [currentForce]="force" [peakForce]="peak" [maxForceLimit]="20" [targetReps]="10" />'})
class Preview { force=signal(0); peak=signal(20); }
localStorage.setItem('zen_balloon_muted','true');
bootstrapApplication(AppComponent,{providers:[provideNoopAnimations(),provideRouter([{path:'game',component:Preview},{path:'**',redirectTo:'game'}]),{provide:SupabaseService,useValue:{isInitialized:signal(false),currentUser:signal(null),userRole:signal('user')}},{provide:BleService,useValue:{connectionState:signal('Connected'),lastSampleAt:signal(1),isSampleFresh:()=>true,batteryPercent:signal(90),batteryLevel:signal('normal'),batteryNotice:signal(null),isSimulated:signal(false)}}]});
