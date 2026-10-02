import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import AuthGuard from "@/components/AuthGuard";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import LoginPage from "@/pages/LoginPage/LoginPage";
import DashboardPage from "@/pages/DashboardPage/DashboardPage";
import CustomerListPage from "@/pages/CustomerListPage/CustomerListPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage/CustomerDetailPage";
import CustomerFormPage from "@/pages/CustomerFormPage/CustomerFormPage";

function CustomerEditPage() {
  return <CustomerFormPage />;
}
import ContactListPage from "@/pages/ContactListPage/ContactListPage";
import ContactDetailPage from "@/pages/ContactDetailPage/ContactDetailPage";
import OpportunityListPage from "@/pages/OpportunityListPage/OpportunityListPage";
import OpportunityDetailPage from "@/pages/OpportunityDetailPage/OpportunityDetailPage";
import FollowupListPage from "@/pages/FollowupListPage/FollowupListPage";
import ContractListPage from "@/pages/ContractListPage/ContractListPage";
import ContractDetailPage from "@/pages/ContractDetailPage/ContractDetailPage";
import ReportPage from "@/pages/ReportPage/ReportPage";
import SystemPage from "@/pages/SystemPage/SystemPage";
import ProjectListPage from "@/pages/ProjectListPage/ProjectListPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage/ProjectDetailPage";
import ProductListPage from "@/pages/ProductListPage/ProductListPage";
import ProductDetailPage from "@/pages/ProductDetailPage/ProductDetailPage";
import QuotationListPage from "@/pages/QuotationListPage/QuotationListPage";
import QuotationDetailPage from "@/pages/QuotationDetailPage/QuotationDetailPage";
import QuotationFormPage from "@/pages/QuotationFormPage/QuotationFormPage";
import QuotationNewPage from "@/pages/QuotationNewPage/QuotationNewPage";
import TaskListPage from "@/pages/TaskListPage/TaskListPage";
import TaskDetailPage from "@/pages/TaskDetailPage/TaskDetailPage";
import EquipmentMaintenancePage from "@/pages/EquipmentMaintenancePage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard><Layout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/edit/:id" element={<CustomerEditPage />} />
          <Route path="contacts" element={<ContactListPage />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="opportunities" element={<OpportunityListPage />} />
          <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="equipment" element={<EquipmentMaintenancePage />} />
          <Route path="quotations" element={<QuotationListPage />} />
          <Route path="quotations/new" element={<QuotationNewPage />} />
          <Route path="quotations/:id" element={<QuotationDetailPage />} />
          <Route path="quotations/edit/:id" element={<QuotationFormPage />} />
          <Route path="followups" element={<FollowupListPage />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="contracts" element={<ContractListPage />} />
          <Route path="contracts/:id" element={<ContractDetailPage />} />
          <Route path="reports" element={<ReportPage />} />
          <Route path="system" element={<SystemPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
