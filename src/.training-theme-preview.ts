// Isolated visual QA: no patient account, backend writes, or Bluetooth device.
import 'zone.js';
import { Component, inject, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { CalibrateComponent } from './app/components/calibrate/calibrate.component';
import { GameComponent } from './app/components/game/game.component';
import { CtarLogicService } from './app/services/ctar-logic.service';
import { SupabaseService } from './app/services/supabase.service';
import { BleService } from './app/services/ble.service';
import { DataSyncService } from './app/services/data-sync.service';
const params = new URLSearchParams(location.search);
localStorage.setItem('theme', params.get('theme') === 'dark' ? 'dark' : 'light');
localStorage.setItem('lang', params.get('lang') === 'en' ? 'en' : 'th');
localStorage.setItem('zen_balloon_muted', 'true');
@Component({standalone:true, imports:[GameComponent], template:'<app-game />'})
class GamePreview {
  constructor() { inject(CtarLogicService).setCalibration(20); }
}
const connectionState = signal(location.pathname === '/game' ? 'Connected' : 'Disconnected');
const ble = {
  connectionState, deviceName:signal('Preview device'), error:signal(null),
  batteryPercent:signal(90), batteryLevel:signal('normal'), batteryNotice:signal(null),
  isSimulated:signal(false), lastSampleAt:signal(1), isSampleFresh:()=>true,
  connect:()=>connectionState.set('Connected'), simulateDevice:()=>connectionState.set('Connected'),
  dismissBatteryNotice:()=>{}, onDataReceived:null,
};
bootstrapApplication(AppComponent,{providers:[
  provideNoopAnimations(), provideRouter([
    {path:'calibrate',component:CalibrateComponent}, {path:'game',component:GamePreview},
    {path:'**',redirectTo:'calibrate'},
  ]),
  {provide:SupabaseService,useValue:{isInitialized:signal(false),currentUser:signal(null),userRole:signal('user')}},
  {provide:BleService,useValue:ble},
  {provide:DataSyncService,useValue:{}},
]});
