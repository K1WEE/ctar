import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, Injector, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataSyncService, RawDataPoint } from '../../../services/data-sync.service';
import { I18nService } from '../../../services/i18n.service';
import { ThemeService } from '../../../services/theme.service';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen pb-10 relative z-10 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        <!-- Back + Title -->
        <div class="flex items-center space-x-4 mb-6">
          <button (click)="goBack()" class="w-12 h-12 rounded-xl bg-white/70 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-brand-accent border border-slate-200 dark:border-white/10 transition-all shadow-sm">
            <i class="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ i18n.t('detail.title') }}</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400" *ngIf="patient()">{{ patient().first_name }} {{ patient().last_name }}</p>
          </div>
          <div class="flex-1"></div>
          <!-- Language Toggle -->
          <button (click)="i18n.toggleLang()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-brand-accent border border-slate-200 dark:border-white/10 text-sm font-bold transition-all">
            {{ i18n.currentLang() === 'th' ? 'EN' : 'TH' }}
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="text-center py-16">
          <i class="fa-solid fa-spinner fa-spin text-4xl text-brand-accent mb-4"></i>
        </div>

        <div *ngIf="!isLoading() && patient()" class="space-y-6 animate-fade-in">

          <!-- Profile & Compliance Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Profile Card -->
            <div class="md:col-span-1 bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/30 text-2xl font-bold">
                  {{ (patient().first_name || '?')[0] }}
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ patient().first_name }} {{ patient().last_name }}</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <i class="fa-solid fa-chart-bar mr-1"></i> {{ sessions().length }} {{ i18n.t('clinic.sessions') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Compliance Heatmap Card -->
            <div class="md:col-span-2 bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg">
              <h3 class="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                <i class="fa-regular fa-calendar-check text-brand-accent mr-2 text-base"></i>
                {{ i18n.currentLang() === 'th' ? 'ประวัติการฝึกใน 30 วันที่ผ่านมา (Compliance)' : 'Training Compliance (Last 30 Days)' }}
              </h3>
              
              <div class="grid grid-cols-10 gap-1.5 justify-items-center items-center">
                <div *ngFor="let day of complianceDays()"
                     [title]="day.dayLabel + ': ' + day.count + ' ' + i18n.t('clinic.sessions')"
                     class="w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold cursor-default transition-all shadow-sm relative group border"
                     [ngClass]="{
                       'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-white/5 text-slate-400 dark:text-slate-600': day.count === 0,
                       'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-300/30 text-emerald-800 dark:text-emerald-300': day.count === 1,
                       'bg-emerald-500 dark:bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20': day.count >= 2
                     }">
                  {{ day.date.getDate() }}
                  
                  <!-- Tooltip -->
                  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-50 shadow-xl border border-white/10">
                    {{ day.dayLabel }} : {{ day.count }} {{ i18n.t('clinic.sessions') }}
                  </div>
                </div>
              </div>
              
              <!-- Legend -->
              <div class="mt-4 flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                <div class="flex items-center space-x-1">
                  <div class="w-3.5 h-3.5 rounded bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5"></div>
                  <span>{{ i18n.currentLang() === 'th' ? 'ไม่ได้ฝึก' : 'No Session' }}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <div class="w-3.5 h-3.5 rounded bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300/30"></div>
                  <span>{{ i18n.currentLang() === 'th' ? 'ฝึก 1 ครั้ง' : '1 Session' }}</span>
                </div>
                <div class="flex items-center space-x-1">
                  <div class="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600"></div>
                  <span>{{ i18n.currentLang() === 'th' ? 'ฝึก 2 ครั้งขึ้นไป' : '2+ Sessions' }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Trend Chart -->
          <div *ngIf="sessions().length > 1" class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-3">
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                  <i class="fa-solid fa-chart-line text-brand-accent mr-2"></i> {{ i18n.t('detail.progressTrend') }}
                </h3>
                
                <span *ngIf="progressStats() as stats" class="w-fit text-sm px-2 py-0.5 rounded-md font-bold flex items-center"
                      [ngClass]="stats.percentage >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'">
                  <i class="fa-solid mr-1" [ngClass]="stats.percentage >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'"></i>
                  {{ stats.percentage > 0 ? '+' : '' }}{{ stats.percentage | number:'1.0-1' }}%
                  <span class="ml-1 text-xs opacity-75 font-medium whitespace-nowrap">{{ i18n.t(stats.label) }}</span>
                </span>
              </div>
              <div class="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start max-w-full overflow-x-auto">
                <button (click)="setTrendMode('day')"
                  [class.bg-white]="trendViewMode() === 'day'" [class.dark:bg-slate-600]="trendViewMode() === 'day'" [class.shadow]="trendViewMode() === 'day'"
                  class="px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-600 dark:text-slate-300">
                  {{ i18n.t('detail.day') }}
                </button>
                <button (click)="setTrendMode('week')"
                  [class.bg-white]="trendViewMode() === 'week'" [class.dark:bg-slate-600]="trendViewMode() === 'week'" [class.shadow]="trendViewMode() === 'week'"
                  class="px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-600 dark:text-slate-300">
                  {{ i18n.t('detail.week') }}
                </button>
                <button (click)="setTrendMode('month')"
                  [class.bg-white]="trendViewMode() === 'month'" [class.dark:bg-slate-600]="trendViewMode() === 'month'" [class.shadow]="trendViewMode() === 'month'"
                  class="px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-600 dark:text-slate-300">
                  {{ i18n.t('detail.month') }}
                </button>
              </div>
            </div>
            <div class="h-64 relative">
              <canvas #trendCanvas></canvas>
            </div>
          </div>

          <!-- Session History Table -->
          <div class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                <i class="fa-solid fa-list-ul text-brand-accent mr-2"></i> {{ i18n.t('detail.sessionHistory') }}
              </h3>
              
              <button *ngIf="compareSessionIds().length > 0" 
                      (click)="clearComparison()" 
                      class="text-xs text-rose-500 hover:text-white px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-500 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-all font-bold">
                <i class="fa-solid fa-trash-can mr-1"></i> {{ i18n.currentLang() === 'th' ? 'ล้างการเปรียบเทียบ' : 'Clear Comparison' }}
              </button>
            </div>
            
            <div *ngIf="sessions().length === 0" class="text-center py-12 text-slate-500">
              <i class="fa-solid fa-inbox text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
              <p>{{ i18n.t('detail.noSessions') }}</p>
            </div>

            <div class="overflow-x-auto" *ngIf="sessions().length > 0">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wider border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th class="px-5 py-3 font-semibold text-center w-12">{{ i18n.currentLang() === 'th' ? 'เทียบ' : 'Compare' }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.date') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.maxForce') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.avgForce') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.reps') }}</th>
                    <th class="px-5 py-3 font-semibold">{{ i18n.t('detail.duration') }}</th>
                    <th class="px-5 py-3 font-semibold text-right">{{ i18n.t('detail.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                  <tr *ngFor="let s of paginatedSessions()" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td class="px-5 py-3.5 text-center">
                      <input type="checkbox"
                             [checked]="isSessionSelectedForCompare(s.id)"
                             (change)="toggleCompareSession(s)"
                             class="w-4 h-4 rounded text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer">
                    </td>
                    <td class="px-5 py-3.5 text-slate-700 dark:text-slate-300">{{ s.session_date | date:'MMM d, y, h:mm a' }}</td>
                    <td class="px-5 py-3.5 text-emerald-600 dark:text-emerald-400 font-bold">{{ s.max_force | number:'1.0-1' }} N</td>
                    <td class="px-5 py-3.5 text-purple-600 dark:text-purple-400 font-bold">{{ (s.avg_force || 0) | number:'1.0-1' }} N</td>
                    <td class="px-5 py-3.5 text-amber-600 dark:text-amber-400 font-bold">{{ s.reps }}</td>
                    <td class="px-5 py-3.5 text-slate-500"><i class="fa-regular fa-clock mr-1 opacity-50"></i>{{ s.duration_seconds }}s</td>
                    <td class="px-5 py-3.5 flex gap-2 justify-end">
                      <button (click)="viewChart(s)" class="text-indigo-600 dark:text-indigo-300 hover:text-white px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-200 dark:border-indigo-500/30 rounded-lg transition-all text-xs font-bold flex items-center gap-1">
                        <i class="fa-solid fa-chart-line"></i> {{ i18n.t('detail.viewChart') }}
                      </button>
                      <button (click)="openDownloadModal(s)" class="text-slate-600 dark:text-slate-300 hover:text-white px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-emerald-500 border border-slate-200 dark:border-slate-600 rounded-lg transition-all text-xs font-bold flex items-center gap-1">
                        <i class="fa-solid fa-download"></i> {{ i18n.t('detail.downloadCSV') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Controls -->
            <div *ngIf="sessions().length > 0" class="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/20">
              
              <!-- Left side: Limit Selector -->
              <div class="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{{ i18n.t('pagination.show') }}</span>
                <select [value]="limit()" (change)="setLimit(+$any($event.target).value)" 
                        class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 font-bold transition-all cursor-pointer">
                  <option [value]="5">5</option>
                  <option [value]="10">10</option>
                  <option [value]="25">25</option>
                  <option [value]="50">50</option>
                </select>
                <span>{{ i18n.t('pagination.entries') }}</span>
              </div>

              <!-- Center: Showing X to Y of Z entries -->
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {{ i18n.t('pagination.showing') }} 
                <span class="font-bold text-slate-800 dark:text-white">{{ showingStart() }}</span> 
                {{ i18n.t('pagination.to') }} 
                <span class="font-bold text-slate-800 dark:text-white">{{ showingEnd() }}</span> 
                {{ i18n.t('pagination.of') }} 
                <span class="font-bold text-slate-800 dark:text-white">{{ sessions().length }}</span>
              </div>

              <!-- Right side: Page Numbers & Prev/Next Buttons -->
              <div class="flex items-center space-x-1.5">
                <!-- Previous Button -->
                <button (click)="prevPage()" [disabled]="currentPage() === 1"
                        class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-accent hover:border-brand-accent/50 disabled:opacity-50 disabled:hover:text-slate-600 disabled:hover:border-slate-200 dark:disabled:hover:text-slate-300 dark:disabled:hover:border-white/10 transition-all flex items-center justify-center">
                  <i class="fa-solid fa-chevron-left mr-1 text-[10px]"></i>
                  {{ i18n.t('pagination.previous') }}
                </button>

                <!-- Page numbers -->
                <button *ngFor="let page of pageRange()" (click)="goToPage(page)"
                        [ngClass]="{
                          'bg-indigo-600 text-white border-indigo-600': currentPage() === page,
                          'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-accent/50': currentPage() !== page
                        }"
                        class="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-extrabold flex items-center justify-center transition-all">
                  {{ page }}
                </button>

                <!-- Next Button -->
                <button (click)="nextPage()" [disabled]="currentPage() === totalPages()"
                        class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-accent hover:border-brand-accent/50 disabled:opacity-50 disabled:hover:text-slate-600 disabled:hover:border-slate-200 dark:disabled:hover:text-slate-300 dark:disabled:hover:border-white/10 transition-all flex items-center justify-center">
                  {{ i18n.t('pagination.next') }}
                  <i class="fa-solid fa-chevron-right ml-1 text-[10px]"></i>
                </button>
              </div>

            </div>
          </div>

          <!-- Session Chart Inspector / Comparison Chart -->
          <div *ngIf="inspectedSession() !== null || compareSessionIds().length > 0" class="bg-white/70 dark:bg-brand-card backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-lg animate-fade-in">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white flex items-center">
                <i class="fa-solid fa-magnifying-glass-chart text-brand-accent mr-2"></i>
                <span *ngIf="inspectedSession() !== null">Force Curve — {{ inspectedSession()?.session_date | date:'MMM d, y' }}</span>
                <span *ngIf="compareSessionIds().length > 0">
                  {{ i18n.currentLang() === 'th' ? 'เปรียบเทียบกราฟแรงกด' : 'Superimposed Force Curve Analysis' }}
                  ({{ compareSessionIds().length }})
                </span>
              </h3>
              <button (click)="inspectedSession() !== null ? closeInspector() : clearComparison()" class="text-slate-500 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 p-2 rounded-lg transition-colors border border-slate-200 dark:border-white/5">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div *ngIf="isBlobLoading()" class="flex flex-col items-center py-12">
              <i class="fa-solid fa-cloud-arrow-down fa-bounce text-3xl text-brand-accent mb-4"></i>
            </div>
            <div [class.hidden]="isBlobLoading()" class="h-80 relative">
              <canvas #sessionCanvas></canvas>
            </div>
          </div>

          <!-- Glassmorphism Download Format Selector Modal -->
          <div *ngIf="showDownloadModal() !== null" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden transition-all duration-300">
              
              <!-- Gradient glow effect -->
              <div class="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div class="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h3 class="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="fa-solid fa-cloud-arrow-down text-emerald-500"></i>
                    <span>{{ i18n.currentLang() === 'th' ? 'เลือกรูปแบบการดาวน์โหลด' : 'Select Download Format' }}</span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {{ i18n.currentLang() === 'th' ? 'กรุณาเลือกรูปแบบข้อมูล CSV ที่คุณต้องการรับ' : 'Please select how you want to export the CSV data' }}
                  </p>
                </div>
                <button (click)="showDownloadModal.set(null)" class="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>

              <!-- Options -->
              <div class="space-y-3 my-5 relative z-10">
                <!-- Option 1: Single Session -->
                <button (click)="triggerDownload('single')" class="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5 transition-all group flex items-start gap-3">
                  <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                    <i class="fa-solid fa-file-csv text-base"></i>
                  </div>
                  <div class="flex-grow">
                    <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {{ i18n.currentLang() === 'th' ? 'ดาวน์โหลดแยกครั้ง (เฉพาะรอบนี้)' : 'Single Session (This round only)' }}
                    </h4>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                      {{ i18n.currentLang() === 'th' ? 'ดึงเฉพาะไฟล์ข้อมูลดิบ 20Hz ของการฝึกครั้งนี้' : 'Export only the raw 20Hz telemetry for this single session' }}
                    </p>
                  </div>
                </button>

                <!-- Option 2: Daily Aggregated -->
                <button (click)="triggerDownload('daily')" class="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-all group flex items-start gap-3">
                  <div class="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                    <i class="fa-solid fa-calendar-day text-base"></i>
                  </div>
                  <div class="flex-grow">
                    <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {{ i18n.currentLang() === 'th' ? 'ดาวน์โหลดรวมรายวัน (รวมทุกครั้งของวัน)' : 'Daily Aggregated (All of this day)' }}
                    </h4>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                      {{ i18n.currentLang() === 'th' ? 'รวมข้อมูลการฝึกทุกรอบในวันเดียวกันเข้าด้วยกันในแผ่นเดียว จัดเรียงแยกเวลาชัดเจน' : 'Merge all exercises performed on this day into a single organized sheet' }}
                    </p>
                  </div>
                </button>

                <!-- Option 3: Monthly Aggregated -->
                <button (click)="triggerDownload('monthly')" class="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/40 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-500/5 transition-all group flex items-start gap-3">
                  <div class="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                    <i class="fa-solid fa-calendar-days text-base"></i>
                  </div>
                  <div class="flex-grow">
                    <h4 class="font-bold text-sm text-slate-800 dark:text-slate-200 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      {{ i18n.currentLang() === 'th' ? 'ดาวน์โหลดรวมรายเดือน (รวมทุกครั้งในเดือน)' : 'Monthly Aggregated (All of this month)' }}
                    </h4>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                      {{ i18n.currentLang() === 'th' ? 'รวมข้อมูลการฝึกทุกรอบที่เกิดขึ้นในเดือนเดียวกัน แยกเวลาและวันที่สวยงาม' : 'Merge all exercises performed in this month into a single organized sheet' }}
                    </p>
                  </div>
                </button>
              </div>

              <!-- Close button -->
              <div class="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5 relative z-10">
                <button (click)="showDownloadModal.set(null)" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  {{ i18n.currentLang() === 'th' ? 'ยกเลิก' : 'Cancel' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Absolute Glassmorphism Loader for Downloading -->
          <div *ngIf="isDownloadingFile()" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in">
            <div class="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <i class="fa-solid fa-cloud-arrow-down fa-bounce text-4xl text-emerald-500 mb-4"></i>
              <h4 class="font-extrabold text-slate-800 dark:text-white text-base">
                {{ i18n.currentLang() === 'th' ? 'กำลังรวบรวมและดาวน์โหลดข้อมูล...' : 'Compiling and Downloading CSV...' }}
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {{ i18n.currentLang() === 'th' ? 'ระบบกำลังดึงข้อมูลความละเอียดสูงและจัดเรียงไฟล์ให้คุณเป็นพิเศษ กรุณารอสักครู่' : 'Fetching high-resolution historical data and building your customized sheet. Please wait a moment.' }}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class PatientDetailComponent implements OnInit, AfterViewInit {
  @ViewChild('trendCanvas') trendCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sessionCanvas') sessionCanvas!: ElementRef<HTMLCanvasElement>;

  public patient = signal<any>(null);
  public sessions = signal<any[]>([]);
  public isLoading = signal(true);

  public limit = signal<number>(10);
  public offset = signal<number>(0);

  public paginatedSessions = computed(() => {
    const s = this.sessions();
    const start = this.offset();
    const end = start + this.limit();
    return s.slice(start, end);
  });

  public totalPages = computed(() => {
    return Math.ceil(this.sessions().length / this.limit());
  });

  public currentPage = computed(() => {
    return Math.floor(this.offset() / this.limit()) + 1;
  });

  public showingStart = computed(() => {
    return this.sessions().length === 0 ? 0 : this.offset() + 1;
  });

  public showingEnd = computed(() => {
    return Math.min(this.offset() + this.limit(), this.sessions().length);
  });

  public pageRange = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  });

  public inspectedSession = signal<any | null>(null);
  public isBlobLoading = signal(false);
  public showDownloadModal = signal<any | null>(null);
  public isDownloadingFile = signal<boolean>(false);
  public trendViewMode = signal<'day' | 'week' | 'month'>('day');
  public progressStats = signal<{ percentage: number, label: string } | null>(null);
  public i18n = inject(I18nService);
  public themeService = inject(ThemeService);

  public compareSessionIds = signal<string[]>([]);
  public compareColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  private rawDataCache = new Map<string, RawDataPoint[]>();

  public complianceDays = computed(() => {
    const sessions = this.sessions();
    const lang = this.i18n.currentLang();

    const days: { date: Date; count: number; dayLabel: string }[] = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 29); // 30 days including today

    const sessionCounts = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.session_date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      sessionCounts.set(dateStr, (sessionCounts.get(dateStr) || 0) + 1);
    });

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const count = sessionCounts.get(dateStr) || 0;
      
      const dayLabel = currentDate.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: 'short'
      });

      days.push({
        date: currentDate,
        count,
        dayLabel
      });
    }

    return days;
  });

  private trendChart: Chart | null = null;
  private sessionChart: Chart | null = null;
  private patientId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataSync: DataSyncService,
    private injector: Injector
  ) {}

  ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.patientId) {
      this.router.navigate(['/clinic/records']);
      return;
    }
    this.loadData();
  }

  ngAfterViewInit() {
    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.updateChartThemes(isDark);
    }, { injector: this.injector });
  }

  async loadData() {
    this.isLoading.set(true);
    this.offset.set(0);
    
    const [profile, sessionData] = await Promise.all([
      this.dataSync.fetchPatientProfile(this.patientId),
      this.dataSync.fetchPatientSessions(this.patientId)
    ]);

    this.patient.set(profile);
    this.sessions.set(sessionData);
    this.isLoading.set(false);

    // Render trend chart after data loads
    setTimeout(() => this.renderTrendChart(), 100);
  }

  private renderTrendChart() {
    if (!this.trendCanvas || this.sessions().length < 2) return;
    const ctx = this.trendCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.trendChart) this.trendChart.destroy();

    const groupedData = this.groupSessions(this.sessions(), this.trendViewMode());
    
    // Calculate percentage change
    if (groupedData.length >= 2) {
      const latest = groupedData[groupedData.length - 1].max_force;
      const previous = groupedData[groupedData.length - 2].max_force;
      
      if (previous > 0) {
        const percentChange = ((latest - previous) / previous) * 100;
        let label = '';
        if (this.trendViewMode() === 'day') label = 'detail.compareDay';
        else if (this.trendViewMode() === 'week') label = 'detail.compareWeek';
        else if (this.trendViewMode() === 'month') label = 'detail.compareMonth';

        this.progressStats.set({ percentage: percentChange, label });
      } else {
        this.progressStats.set(null);
      }
    } else {
      this.progressStats.set(null);
    }

    const isDark = this.themeService.isDarkMode();

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: groupedData.map(d => d.label),
        datasets: [
          {
            label: this.i18n.t('detail.maxForce') + ' (N)',
            data: groupedData.map(d => d.max_force),
            borderColor: '#3b82f6',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            fill: true,
            tension: 0.3
          },
          {
            label: this.i18n.t('detail.avgForce') + ' (N)',
            data: groupedData.map(d => d.avg_force),
            borderColor: '#a855f7',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#a855f7',
            borderDash: [5, 5],
            fill: false,
            tension: 0.3
          },
          {
            label: this.i18n.t('detail.reps'),
            data: groupedData.map(d => d.reps),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#f59e0b',
            borderDash: [5, 5],
            fill: false,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: { color: isDark ? '#94a3b8' : '#64748b', padding: 16, usePointStyle: true, boxWidth: 8 }
          }
        },
        scales: {
          x: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          }
        }
      }
    });
  }

  setTrendMode(mode: 'day' | 'week' | 'month') {
    this.trendViewMode.set(mode);
    this.renderTrendChart();
  }

  setLimit(newLimit: number) {
    this.limit.set(newLimit);
    this.offset.set(0);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.offset.set((page - 1) * this.limit());
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.offset.set(this.offset() + this.limit());
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.offset.set(Math.max(0, this.offset() - this.limit()));
    }
  }

  private groupSessions(sessions: any[], mode: 'day' | 'week' | 'month') {
    const map = new Map<string, { sumMaxForce: number, sumAvgForce: number, sumReps: number, count: number, timestamp: number }>();
    
    sessions.forEach(s => {
      const date = new Date(s.session_date);
      let key = '';
      if (mode === 'day') {
        key = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      } else if (mode === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `สัปดาห์ ${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
      } else if (mode === 'month') {
        key = date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
      }

      if (!map.has(key)) {
        map.set(key, { sumMaxForce: 0, sumAvgForce: 0, sumReps: 0, count: 0, timestamp: date.getTime() });
      }
      const entry = map.get(key)!;
      entry.sumMaxForce += Number(s.max_force);
      entry.sumAvgForce += Number(s.avg_force || 0);
      entry.sumReps += Number(s.reps);
      entry.count += 1;
      if (date.getTime() < entry.timestamp) entry.timestamp = date.getTime();
    });

    return Array.from(map.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([label, val]) => ({
        label,
        max_force: val.sumMaxForce / val.count,
        avg_force: val.sumAvgForce / val.count,
        reps: Math.round(val.sumReps / val.count)
      }));
  }

  async getRawDataCached(session: any): Promise<RawDataPoint[]> {
    const cacheKey = session.id;
    if (this.rawDataCache.has(cacheKey)) {
      return this.rawDataCache.get(cacheKey)!;
    }
    const data = await this.dataSync.fetchRawSessionData(session.file_url);
    this.rawDataCache.set(cacheKey, data);
    return data;
  }

  isSessionSelectedForCompare(id: string): boolean {
    return this.compareSessionIds().includes(id);
  }

  toggleCompareSession(session: any) {
    this.inspectedSession.set(null); // close single inspector

    const ids = [...this.compareSessionIds()];
    const index = ids.indexOf(session.id);
    if (index > -1) {
      ids.splice(index, 1);
    } else {
      if (ids.length >= 5) {
        alert(this.i18n.currentLang() === 'th' ? 'เปรียบเทียบได้สูงสุด 5 เซสชัน' : 'Compare up to 5 sessions max');
        return;
      }
      ids.push(session.id);
    }
    this.compareSessionIds.set(ids);

    if (ids.length > 0) {
      this.viewCompareChart();
    } else {
      if (this.sessionChart) {
        this.sessionChart.destroy();
        this.sessionChart = null;
      }
    }
  }

  clearComparison() {
    this.compareSessionIds.set([]);
    if (this.sessionChart) {
      this.sessionChart.destroy();
      this.sessionChart = null;
    }
  }

  async viewCompareChart() {
    this.isBlobLoading.set(true);

    if (this.sessionChart) {
      this.sessionChart.destroy();
      this.sessionChart = null;
    }

    const selectedIds = this.compareSessionIds();
    const selectedSessions = this.sessions().filter(s => selectedIds.includes(s.id));

    try {
      const rawDataList = await Promise.all(selectedSessions.map(async s => {
        const raw = await this.getRawDataCached(s);
        return { session: s, raw };
      }));

      this.isBlobLoading.set(false);

      const validList = rawDataList.filter(item => item.raw && item.raw.length > 0);
      if (validList.length === 0) {
        return;
      }

      setTimeout(() => this.renderCompareChart(validList), 50);
    } catch (e) {
      console.error(e);
      this.isBlobLoading.set(false);
    }
  }

  private renderCompareChart(rawDataList: { session: any; raw: RawDataPoint[] }[]) {
    if (!this.sessionCanvas) return;
    const ctx = this.sessionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const isDark = this.themeService.isDarkMode();

    const maxLengthItem = rawDataList.reduce((max, item) => item.raw.length > max.raw.length ? item : max, rawDataList[0]);
    const labels = maxLengthItem.raw.map(d => d.timeLabel);

    const datasets = rawDataList.map((item, idx) => {
      const color = this.compareColors[idx % this.compareColors.length];
      const d = new Date(item.session.session_date);
      const dateStr = d.toLocaleDateString(this.i18n.currentLang() === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      return {
        label: `${dateStr} (Max: ${item.session.max_force.toFixed(1)}N, Reps: ${item.session.reps})`,
        data: item.raw.map(dp => dp.force),
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3
      };
    });

    this.sessionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: isDark ? '#94a3b8' : '#64748b', padding: 12 }
          }
        },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          }
        }
      }
    });
  }

  async viewChart(session: any) {
    this.compareSessionIds.set([]); // Reset comparison when looking at a single session
    this.inspectedSession.set(session);
    this.isBlobLoading.set(true);

    if (this.sessionChart) {
      this.sessionChart.destroy();
      this.sessionChart = null;
    }

    const rawSeries = await this.getRawDataCached(session);
    this.isBlobLoading.set(false);

    if (!rawSeries || rawSeries.length === 0) {
      alert(this.i18n.t('detail.noRawData'));
      return;
    }

    setTimeout(() => this.renderSessionChart(rawSeries), 50);
  }

  private renderSessionChart(rawSeries: RawDataPoint[]) {
    if (!this.sessionCanvas) return;
    const ctx = this.sessionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const isDark = this.themeService.isDarkMode();
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    this.sessionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rawSeries.map(d => d.timeLabel),
        datasets: [{
          label: 'Force (N)',
          data: rawSeries.map(d => d.force),
          borderColor: '#3b82f6',
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#64748b' : '#94a3b8' }
          }
        }
      }
    });
  }

  closeInspector() {
    this.inspectedSession.set(null);
    if (this.sessionChart) {
      this.sessionChart.destroy();
      this.sessionChart = null;
    }
  }

  openDownloadModal(session: any) {
    this.showDownloadModal.set(session);
  }

  async triggerDownload(mode: 'single' | 'daily' | 'monthly') {
    const session = this.showDownloadModal();
    if (!session) return;
    this.showDownloadModal.set(null);

    if (mode === 'single') {
      await this.downloadCSV(session);
      return;
    }

    this.isDownloadingFile.set(true);
    try {
      const getYYYYMMDD = (dStr: string) => {
        const d = new Date(dStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const getYYYYMM = (dStr: string) => {
        const d = new Date(dStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };

      const targetRefStr = session.session_date;
      let matchedSessions = [];
      let filenameLabel = '';

      if (mode === 'daily') {
        const targetDay = getYYYYMMDD(targetRefStr);
        matchedSessions = this.sessions().filter(s => getYYYYMMDD(s.session_date) === targetDay);
        filenameLabel = `Daily_${targetDay}`;
      } else {
        const targetMonth = getYYYYMM(targetRefStr);
        matchedSessions = this.sessions().filter(s => getYYYYMM(s.session_date) === targetMonth);
        filenameLabel = `Monthly_${targetMonth}`;
      }

      // Sort chronologically ascending
      matchedSessions.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

      if (matchedSessions.length === 0) {
        this.isDownloadingFile.set(false);
        return;
      }

      let csvContent = '';

      // If Daily mode, add a beautiful global Day Header at the very top of the file
      if (mode === 'daily') {
        const targetDay = getYYYYMMDD(targetRefStr);
        const localDateLabel = new Date(targetRefStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
        csvContent += `"=========================================================================","",""\n`;
        csvContent += `"📅 วันที่ฝึก: ${localDateLabel} (Date: ${targetDay})","",""\n`;
        csvContent += `"=========================================================================","",""\n\n`;
      }

      let lastDayStr = '';

      for (let index = 0; index < matchedSessions.length; index++) {
        const s = matchedSessions[index];
        const rawSeries = await this.getRawDataCached(s);
        if (!rawSeries || rawSeries.length === 0) continue;

        // If Monthly mode, add a Day Transition Header when the day changes
        if (mode === 'monthly') {
          const dayStr = getYYYYMMDD(s.session_date);
          if (dayStr !== lastDayStr) {
            lastDayStr = dayStr;
            const localDateLabel = new Date(s.session_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
            csvContent += `\n`;
            csvContent += `"=========================================================================","",""\n`;
            csvContent += `"📅 วันที่ฝึก: ${localDateLabel} (Date: ${dayStr})","",""\n`;
            csvContent += `"=========================================================================","",""\n\n`;
          }
        }

        const timeString = new Date(s.session_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const dateString = new Date(s.session_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const sessionMax = Number(s.max_force) || 40;

        csvContent += `"-------------------------------------------------------------------------","",""\n`;
        csvContent += `"🏋️ การฝึกครั้งที่ ${index + 1} ของวัน (${dateString} เวลา ${timeString})","",""\n`;
        csvContent += `"⏱️ แรงบีบเป้าหมายสูงสุด (Calibrated Max): ${sessionMax} N","",""\n`;
        csvContent += `"-------------------------------------------------------------------------","",""\n`;
        csvContent += `"เวลา (Timestamp)","เวลาสะสม (Seconds)","แรงบีบ (Applied Force in Newtons)"\n`;

        let currentRepVal = 0;
        let hasSqueezed = false;
        const highThreshold = Math.max(6.0, sessionMax * 0.45);
        const lowThreshold = Math.max(4.0, sessionMax * 0.12);

        rawSeries.forEach(dp => {
          const force = Number(dp.force);
          let isRepEndThisStep = false;

          if (!hasSqueezed) {
            if (force >= highThreshold) {
              hasSqueezed = true;
            }
          } else {
            if (force <= lowThreshold) {
              currentRepVal++;
              isRepEndThisStep = true;
              hasSqueezed = false;
            }
          }

          const readableDate = new Date(dp.timestamp).toLocaleString('th-TH');
          csvContent += `"${readableDate}",${dp.timeLabel},${dp.force}\n`;

          if (isRepEndThisStep) {
            csvContent += `"-------------------------------------------------------------------------","",""\n`;
            csvContent += `"✅ สำเร็จรอบที่ ${currentRepVal} (SUCCESSFUL ROUND ${currentRepVal})","ปล่อยแรงตกต่ำกว่า 4.0N เพื่อพักครบกำหนดแล้ว",""\n`;
            csvContent += `"-------------------------------------------------------------------------","",""\n`;
          }
        });

        csvContent += `\n\n\n`; // Multiple spacer rows to make Excel look clean and separate tables
      }

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CTAR_${this.patient()?.first_name || 'Patient'}_${filenameLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate aggregated download:', err);
    } finally {
      this.isDownloadingFile.set(false);
    }
  }

  async downloadCSV(session: any) {
    this.isDownloadingFile.set(true);
    const rawSeries = await this.getRawDataCached(session);
    if (!rawSeries || rawSeries.length === 0) {
      this.isDownloadingFile.set(false);
      return;
    }

    const sessionMax = Number(session.max_force) || 40;
    const timeString = new Date(session.session_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateString = new Date(session.session_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let csvContent = '';
    csvContent += `"=========================================================================","",""\n`;
    csvContent += `"🏋️ ไฟล์ข้อมูลการฝึก (Single Session Data Sheet)","",""\n`;
    csvContent += `"📅 วันที่ฝึก: ${dateString} | ⏱️ เวลา: ${timeString}","",""\n`;
    csvContent += `"💪 แรงบีบเป้าหมายสูงสุด (Calibrated Max): ${sessionMax} N","",""\n`;
    csvContent += `"=========================================================================","",""\n\n`;
    csvContent += `"เวลา (Timestamp)","เวลาสะสม (Seconds)","แรงบีบ (Applied Force in Newtons)"\n`;

    let currentRepVal = 0;
    let hasSqueezed = false;
    const highThreshold = Math.max(6.0, sessionMax * 0.45);
    const lowThreshold = Math.max(4.0, sessionMax * 0.12);

    rawSeries.forEach(dp => {
      const force = Number(dp.force);
      let isRepEndThisStep = false;

      if (!hasSqueezed) {
        if (force >= highThreshold) {
          hasSqueezed = true;
        }
      } else {
        if (force <= lowThreshold) {
          currentRepVal++;
          isRepEndThisStep = true;
          hasSqueezed = false;
        }
      }

      const readableDate = new Date(dp.timestamp).toLocaleString('th-TH');
      csvContent += `"${readableDate}",${dp.timeLabel},${dp.force}\n`;

      if (isRepEndThisStep) {
        csvContent += `"-------------------------------------------------------------------------","",""\n`;
        csvContent += `"✅ สำเร็จรอบที่ ${currentRepVal} (SUCCESSFUL ROUND ${currentRepVal})","ปล่อยแรงตกต่ำกว่า 4.0N เพื่อพักครบกำหนดแล้ว",""\n`;
        csvContent += `"-------------------------------------------------------------------------","",""\n`;
      }
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CTAR_${this.patient()?.first_name}_${session.session_date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.isDownloadingFile.set(false);
  }

  private updateChartThemes(isDark: boolean) {
    [this.trendChart, this.sessionChart].forEach(chart => {
      if (!chart) return;
      const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      const tickColor = isDark ? '#64748b' : '#94a3b8';

      ['x', 'y'].forEach(axis => {
        const scale = chart.options.scales?.[axis];
        if (scale) {
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.ticks) scale.ticks.color = tickColor;
        }
      });

      if (chart.options.plugins?.legend?.labels) {
        (chart.options.plugins.legend.labels as any).color = tickColor;
      }
      chart.update('none');
    });
  }

  goBack() {
    this.router.navigate(['/clinic/records']);
  }
}
