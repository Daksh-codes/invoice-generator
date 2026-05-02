import Layout from "./component/Layout";
import BillsDashboard from "./pages/Billsdashboard ";
import FirmForm from "./pages/Firmform";
import InvoicePreviewPage from "./pages/Invoicepreviewpage";
import { Route, Routes } from "react-router-dom";
import FirmsList from "./pages/Firmslist";
import ClientsPage from "./pages/Clientspage";
import BillForm from "./pages/Billform"
import BillEditForm from "./pages/BillEditForm";
import PrefixHistoryPage from "./pages/PrefixHistoryPage";
import Reports from "./pages/Reports";

function App() {
  return (
    <Routes>
      {/* Pages WITH navbar */}
      <Route element={<Layout />}>
        <Route path="/" element={<BillsDashboard />} />
        <Route path="/bills/new" element={<BillForm />} />
        <Route path="/firms/new" element={<FirmForm />} />
        <Route path="/firms/:id/edit" element={<FirmForm />} />
        <Route path="/firms" element={<FirmsList />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/bills/:id/edit" element={<BillEditForm />} />
        <Route path="/firms/:id/prefix-history" element={<PrefixHistoryPage />} />
        
      </Route>

      {/* Pages WITHOUT navbar — clean print layout */}
      <Route path="/bills/:id/preview" element={<InvoicePreviewPage />} />
    </Routes>
  );
}
export default App;
