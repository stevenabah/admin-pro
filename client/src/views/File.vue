<template>
  <div class="file-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>文件管理</span>
          <el-upload :action="uploadUrl" :headers="headers" :show-file-list="false" :on-success="handleUploadSuccess">
            <el-button type="primary">上传文件</el-button>
          </el-upload>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="搜索文件名" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="originalName" label="文件名" />
        <el-table-column prop="mimeType" label="类型" width="150" />
        <el-table-column prop="size" label="大小" width="120">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handlePreview(row)">预览</el-button>
            <el-button type="success" size="small" @click="handleDownload(row.id)">下载</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; text-align: right"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog v-model="previewVisible" title="文件预览" width="600px">
      <div v-if="previewFile" class="preview-content">
        <img v-if="previewFile.mimeType.startsWith('image/')" :src="previewFile.url" style="max-width: 100%" />
        <div v-else>
          <el-icon :size="60" color="#999"><Document /></el-icon>
          <p>{{ previewFile.originalName }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/stores/user'

const tableData = ref<any[]>([])
const searchForm = reactive({ keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const previewVisible = ref(false)
const previewFile = ref<any>(null)

const uploadUrl = '/api/files/upload'
const headers = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const fetchData = async () => {
  const res = await api.get('/files', {
    params: { page: pagination.page, pageSize: pagination.pageSize, keyword: searchForm.keyword }
  })
  if (res.code === 200) {
    tableData.value = res.data.list
    pagination.total = res.data.total
  }
}

const handleUploadSuccess = (res: any) => {
  if (res.code === 200) {
    ElMessage.success('上传成功')
    fetchData()
  }
}

const handlePreview = (row: any) => {
  previewFile.value = row
  previewVisible.value = true
}

const handleDownload = async (id: string) => {
  const token = localStorage.getItem('token')
  const link = document.createElement('a')
  link.href = `/api/files/${id}/download`
  link.download = ''
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleDelete = (id: string) => {
  ElMessageBox.confirm('确定要删除该文件吗？', '提示', { type: 'warning' }).then(async () => {
    const res = await api.delete(`/files/${id}`)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchData()
    }
  })
}

const formatSize = (size: number) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN')

onMounted(() => fetchData())
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-content {
  text-align: center;
  padding: 20px;
}
</style>