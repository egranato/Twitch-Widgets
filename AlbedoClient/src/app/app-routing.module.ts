import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlertsComponent } from './components/alerts/alerts.component';
import { ChatComponent } from './components/chat/chat.component';
import { DisplayComponent } from './components/display/display.component';

const routes: Routes = [
  {
    path: '',
    component: ChatComponent,
  },
  {
    path: 'alerts',
    component: AlertsComponent,
  },
  {
    path: 'display',
    component: DisplayComponent,
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
