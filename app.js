// Cấu hình hệ thống
const CONFIG = {
    ITEMS_PER_PAGE: 10,
    DEBOUNCE_DELAY: 300,
    DATA_URL: 'data.json'
};

// Biến toàn cục
let allData = [];
let filteredData = [];
let currentPage = 1;
let totalPages = 1;
let filterTimeout = null;

// DOM Elements
const elements = {
    tableBody: document.getElementById('table-body'),
    loadingOverlay: document.getElementById('loading-overlay'),
    totalRecords: document.getElementById('total-records'),
    filteredRecords: document.getElementById('filtered-records'),
    searchResults: document.getElementById('search-results'),
    currentPage: document.getElementById('current-page'),
    totalPages: document.getElementById('total-pages'),
    pageNumbers: document.getElementById('page-numbers'),
    exportBtn: document.getElementById('export-btn'),
    filterTenNhom: document.getElementById('filter-ten-nhom'),
    filterTen: document.getElementById('filter-ten'),
    filterMa: document.getElementById('filter-ma'),
    firstPage: document.getElementById('first-page'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    lastPage: document.getElementById('last-page')
};

// Hàm tiện ích
const utils = {
    // Debounce để tối ưu hiệu năng khi nhập liệu
    debounce(func, delay) {
        return function(...args) {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // Parse số tiền có dấu phẩy
    parseCurrency(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(value.replace(/,/g, '')) || 0;
    },

    // Format số tiền
    formatCurrency(value) {
        const num = this.parseCurrency(value);
        return num.toLocaleString('vi-VN') + ' đ';
    },

    // Format ngày
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch {
            return dateString;
        }
    },

    // Highlight text trong kết quả tìm kiếm
    highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text;
        
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
};

// Data Manager
const dataManager = {
    // Tải dữ liệu từ JSON
    async loadData() {
        try {
            elements.loadingOverlay.style.display = 'flex';
            
            const response = await fetch(CONFIG.DATA_URL);
            if (!response.ok) throw new Error('Không thể tải dữ liệu');
            
            allData = await response.json();
            filteredData = [...allData];
            
            this.updateStats();
            this.renderTable();
            this.setupPagination();
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            this.showError('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            elements.loadingOverlay.style.display = 'none';
        }
    },

    // Lọc dữ liệu
    filterData() {
        const tenNhomFilter = elements.filterTenNhom.value.trim().toLowerCase();
        const tenFilter = elements.filterTen.value.trim().toLowerCase();
        const maFilter = elements.filterMa.value.trim().toLowerCase();

        filteredData = allData.filter(item => {
            // Lọc theo Tên nhóm
            if (tenNhomFilter && 
                !item["Tên nhóm"].toLowerCase().includes(tenNhomFilter)) {
                return false;
            }
            
            // Lọc theo Tên
            if (tenFilter && 
                !item["Tên"].toLowerCase().includes(tenFilter)) {
                return false;
            }
            
            // Lọc theo Mã
            if (maFilter && 
                !item["Mã"].toLowerCase().includes(maFilter)) {
                return false;
            }
            
            return true;
        });

        currentPage = 1;
        this.updateStats();
        this.renderTable();
        this.setupPagination();
    },

    // Cập nhật thống kê
    updateStats() {
        elements.totalRecords.textContent = allData.length;
        elements.filteredRecords.textContent = filteredData.length;
        elements.searchResults.textContent = filteredData.length;
    },

    // Hiển thị bảng với phân trang
    renderTable() {
        elements.tableBody.innerHTML = '';
        
        if (filteredData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" class="no-data">
                    <div style="font-size: 18px; margin-bottom: 10px;">📭</div>
                    Không tìm thấy dữ liệu phù hợp với bộ lọc
                </td>
            `;
            elements.tableBody.appendChild(row);
            return;
        }

        const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
        const pageData = filteredData.slice(startIndex, endIndex);

        const tenNhomFilter = elements.filterTenNhom.value.trim().toLowerCase();
        const tenFilter = elements.filterTen.value.trim().toLowerCase();
        const maFilter = elements.filterMa.value.trim().toLowerCase();

        pageData.forEach(item => {
            const row = document.createElement('tr');
            
            // Highlight các ô được tìm kiếm
            const tenNhomCell = tenNhomFilter ? 
                utils.highlightText(item["Tên nhóm"], tenNhomFilter) : 
                item["Tên nhóm"];
            
            const tenCell = tenFilter ? 
                utils.highlightText(item["Tên"], tenFilter) : 
                item["Tên"];
            
            const maCell = maFilter ? 
                utils.highlightText(item["Mã"], maFilter) : 
                item["Mã"];

            row.innerHTML = `
                <td>${tenNhomCell || ''}</td>
                <td>${maCell || ''}</td>
                <td>${tenCell || ''}</td>
                <td>${item["Mã KH"] || ''}</td>
                <td>${item["Tên KH"] || ''}</td>
                <td>${item["Địa chỉ"] || ''}</td>
                <td class="doanh-so-cell">${utils.formatCurrency(item["Doanh số"])}</td>
                <td>${item["Ngày Upload"]}</td>
            `;
            
            elements.tableBody.appendChild(row);
        });
    },

    // Thiết lập phân trang
    setupPagination() {
        totalPages = Math.ceil(filteredData.length / CONFIG.ITEMS_PER_PAGE);
        totalPages = totalPages || 1;
        
        elements.currentPage.textContent = currentPage;
        elements.totalPages.textContent = totalPages;
        
        // Cập nhật trạng thái nút
        elements.firstPage.disabled = currentPage === 1;
        elements.prevPage.disabled = currentPage === 1;
        elements.nextPage.disabled = currentPage === totalPages;
        elements.lastPage.disabled = currentPage === totalPages;
        
        // Tạo số trang
        this.renderPageNumbers();
    },

    // Render số trang
    renderPageNumbers() {
        elements.pageNumbers.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = startPage + maxVisiblePages - 1;
        
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn';
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                this.renderTable();
                this.setupPagination();
            });
            elements.pageNumbers.appendChild(pageBtn);
        }
    },

    // Xuất dữ liệu
    exportData() {
        const dataStr = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `du_lieu_da_loc_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Hiển thị lỗi
    showError(message) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data" style="color: #dc3545;">
                    <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
                    ${message}
                </td>
            </tr>
        `;
    }
};

// Sự kiện phân trang
elements.firstPage.addEventListener('click', () => {
    currentPage = 1;
    dataManager.renderTable();
    dataManager.setupPagination();
});

elements.prevPage.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        dataManager.renderTable();
        dataManager.setupPagination();
    }
});

elements.nextPage.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        dataManager.renderTable();
        dataManager.setupPagination();
    }
});

elements.lastPage.addEventListener('click', () => {
    currentPage = totalPages;
    dataManager.renderTable();
    dataManager.setupPagination();
});

// Sự kiện xuất dữ liệu
elements.exportBtn.addEventListener('click', () => {
    dataManager.exportData();
});

// Sự kiện bộ lọc với debounce
const debouncedFilter = utils.debounce(() => {
    dataManager.filterData();
}, CONFIG.DEBOUNCE_DELAY);

elements.filterTenNhom.addEventListener('input', debouncedFilter);
elements.filterTen.addEventListener('input', debouncedFilter);
elements.filterMa.addEventListener('input', debouncedFilter);

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    dataManager.loadData();
});